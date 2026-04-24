import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { improveProposal, generateProposal } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT pr.*, c.name as client_name FROM proposals pr LEFT JOIN clients c ON pr.client_id = c.id WHERE pr.user_id = $1`;
    const params = [req.user.id];
    if (search) { query += ` AND (pr.title ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { query += ` AND pr.status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY pr.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
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

export default router;
