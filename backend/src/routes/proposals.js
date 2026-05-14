import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { improveProposal, generateProposal, callAI } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let base = `FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id WHERE pr.user_id = $1`;
    const params = [req.user.id];
    if (search) { base += ` AND pr.title ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
    if (status) { base += ` AND pr.status = $${params.length + 1}`; params.push(status); }

    const countResult = await pool.query(`SELECT COUNT(*) ${base}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT pr.*, c.name as client_name ${base} ORDER BY pr.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    );

    res.json({
      data: result.rows,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pr.*, c.name as client_name FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id WHERE pr.id = $1 AND pr.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, title, description, proposed_amount, status, sent_date } = req.body;
    const result = await pool.query(
      'INSERT INTO proposals (user_id, client_id, title, description, proposed_amount, status, sent_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, client_id, title, description, proposed_amount, status || 'draft', sent_date]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, title, description, proposed_amount, status, sent_date, response_date } = req.body;
    const result = await pool.query(
      'UPDATE proposals SET client_id=$1, title=$2, description=$3, proposed_amount=$4, status=$5, sent_date=$6, response_date=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [client_id, title, description, proposed_amount, status, sent_date, response_date, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM proposals WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-improve', async (req, res) => {
  try {
    const pr = await pool.query('SELECT pr.*, c.name as client_name FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id WHERE pr.id = $1 AND pr.user_id = $2', [req.params.id, req.user.id]);
    if (pr.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await improveProposal(pr.rows[0]);
    await pool.query('UPDATE proposals SET ai_win_probability = $1, ai_improvements = $2, ai_content_suggestions = $3 WHERE id = $4',
      [analysis.win_probability, JSON.stringify(analysis), JSON.stringify(analysis.improvements), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-generate', async (req, res) => {
  try {
    const { brief } = req.body;
    const analysis = await generateProposal(brief);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/proposals/:id/outcome - Record win/loss outcome for win rate tracking
router.post('/:id/outcome', async (req, res) => {
  try {
    const { outcome, notes } = req.body; // outcome: 'won' | 'lost' | 'cancelled'
    const validOutcomes = ['won', 'lost', 'cancelled'];
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({ error: `outcome must be one of: ${validOutcomes.join(', ')}` });
    }

    const newStatus = outcome === 'won' ? 'accepted' : outcome === 'lost' ? 'rejected' : 'cancelled';
    const result = await pool.query(
      'UPDATE proposals SET status=$1, response_date=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3 AND user_id=$4 RETURNING *',
      [newStatus, new Date().toISOString().split('T')[0], req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    res.json({ proposal: result.rows[0], outcome_recorded: outcome });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/proposals/analytics/win-rate - Proposal win rate analysis with AI recalibration tips
router.get('/analytics/win-rate', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('accepted','rejected','cancelled')) as total_closed,
        COUNT(*) FILTER (WHERE status = 'accepted') as won,
        COUNT(*) FILTER (WHERE status = 'rejected') as lost,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status IN ('draft','sent')) as open,
        COALESCE(AVG(proposed_amount) FILTER (WHERE status = 'accepted'), 0) as avg_won_amount,
        COALESCE(AVG(proposed_amount) FILTER (WHERE status = 'rejected'), 0) as avg_lost_amount,
        COALESCE(AVG(ai_win_probability) FILTER (WHERE ai_win_probability IS NOT NULL AND status = 'accepted'), 0) as avg_predicted_prob_won,
        COALESCE(AVG(ai_win_probability) FILTER (WHERE ai_win_probability IS NOT NULL AND status = 'rejected'), 0) as avg_predicted_prob_lost
       FROM proposals WHERE user_id = $1`,
      [req.user.id]
    );

    const stats = result.rows[0];
    const total = parseInt(stats.total_closed);
    const won = parseInt(stats.won);
    const win_rate = total > 0 ? Math.round((won / total) * 100) : 0;

    // Fetch recent lost proposals for AI analysis
    const lost_proposals = await pool.query(
      `SELECT pr.title, pr.proposed_amount, pr.ai_win_probability, pr.ai_improvements, c.industry
       FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id
       WHERE pr.user_id = $1 AND pr.status = 'rejected'
       ORDER BY pr.response_date DESC LIMIT 5`,
      [req.user.id]
    );

    const won_proposals = await pool.query(
      `SELECT pr.title, pr.proposed_amount, pr.ai_win_probability, c.industry
       FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id
       WHERE pr.user_id = $1 AND pr.status = 'accepted'
       ORDER BY pr.response_date DESC LIMIT 5`,
      [req.user.id]
    );

    let ai_calibration = null;
    if (total >= 3) {
      try {
        const systemPrompt = `You are a sales performance analyst. Analyze proposal win/loss data and provide recalibration recommendations. Return JSON:
{
  "win_rate_assessment": "excellent/good/needs_improvement",
  "key_patterns": ["pattern from won deals", "pattern from lost deals"],
  "pricing_insight": "analysis of won vs lost amounts",
  "improvement_tips": ["actionable tip 1", "actionable tip 2", "actionable tip 3"],
  "ai_accuracy_note": "how well AI win probability predictions matched actual outcomes",
  "focus_areas": ["area to focus on to improve win rate"]
}`;

        const userPrompt = `Win rate analysis:
Total closed proposals: ${total}
Won: ${won} (${win_rate}%)
Lost: ${parseInt(stats.lost)} (${total > 0 ? Math.round((parseInt(stats.lost) / total) * 100) : 0}%)
Avg won amount: $${parseFloat(stats.avg_won_amount).toFixed(0)}
Avg lost amount: $${parseFloat(stats.avg_lost_amount).toFixed(0)}
AI model avg predicted probability for won deals: ${parseFloat(stats.avg_predicted_prob_won).toFixed(2)}
AI model avg predicted probability for lost deals: ${parseFloat(stats.avg_predicted_prob_lost).toFixed(2)}

Recent lost proposals: ${JSON.stringify(lost_proposals.rows.map(p => ({ title: p.title, amount: p.proposed_amount, ai_prob: p.ai_win_probability, industry: p.industry })))}
Recent won proposals: ${JSON.stringify(won_proposals.rows.map(p => ({ title: p.title, amount: p.proposed_amount, ai_prob: p.ai_win_probability, industry: p.industry })))}`;

        ai_calibration = JSON.parse((await callAI(systemPrompt, userPrompt)).match(/\{[\s\S]*\}/)?.[0] || '{}');
      } catch {}
    }

    res.json({
      stats: {
        win_rate,
        total_closed: total,
        won: parseInt(stats.won),
        lost: parseInt(stats.lost),
        cancelled: parseInt(stats.cancelled),
        open: parseInt(stats.open),
        avg_won_amount: parseFloat(parseFloat(stats.avg_won_amount).toFixed(2)),
        avg_lost_amount: parseFloat(parseFloat(stats.avg_lost_amount).toFixed(2)),
      },
      ai_calibration,
      note: total < 3 ? 'Record at least 3 proposal outcomes to unlock AI win-rate calibration.' : null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
