import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { scoreClientHealth } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = 'FROM clients WHERE user_id = $1';
    const params = [req.user.id];
    if (search) { baseQuery += ` AND (name ILIKE $${params.length + 1} OR company ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { baseQuery += ` AND status = $${params.length + 1}`; params.push(status); }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
    const result = await pool.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, email, phone, company, industry, status, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await pool.query(
      'INSERT INTO clients (user_id, name, email, phone, company, industry, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, name, email, phone, company, industry, status || 'active', notes]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, phone, company, industry, status, notes } = req.body;
    const result = await pool.query(
      'UPDATE clients SET name=$1, email=$2, phone=$3, company=$4, industry=$5, status=$6, notes=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [name, email, phone, company, industry, status, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-health', aiRateLimiter, async (req, res) => {
  try {
    const client = await pool.query('SELECT * FROM clients WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (client.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const projects = await pool.query('SELECT * FROM projects WHERE client_id = $1', [req.params.id]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE client_id = $1', [req.params.id]);
    const analysis = await scoreClientHealth(client.rows[0], projects.rows, invoices.rows);
    await pool.query('UPDATE clients SET health_score = $1, ai_notes = $2 WHERE id = $3', [analysis.health_score, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Client churn early warning — scores all active clients and returns sorted by risk
router.get('/churn-risk', aiRateLimiter, async (req, res) => {
  try {
    const clients = await pool.query(
      `SELECT c.*,
        (SELECT MAX(created_at) FROM projects WHERE client_id = c.id) as last_project_date,
        (SELECT COUNT(*) FROM projects WHERE client_id = c.id AND status = 'active') as active_projects,
        (SELECT COUNT(*) FROM invoices WHERE client_id = c.id AND status = 'overdue') as overdue_invoices,
        (SELECT COUNT(*) FROM invoices WHERE client_id = c.id AND status = 'paid') as paid_invoices,
        (SELECT MAX(created_at) FROM invoices WHERE client_id = c.id) as last_invoice_date
       FROM clients c
       WHERE c.user_id = $1 AND c.status = 'active'
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );

    if (clients.rows.length === 0) return res.json({ data: [], total: 0 });

    const scored = [];
    for (const client of clients.rows) {
      const projects = await pool.query('SELECT * FROM projects WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5', [client.id]);
      const invoices = await pool.query('SELECT * FROM invoices WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5', [client.id]);

      let analysis;
      try {
        analysis = await scoreClientHealth(client, projects.rows, invoices.rows);
        await pool.query('UPDATE clients SET health_score = $1, ai_notes = $2 WHERE id = $3',
          [analysis.health_score, JSON.stringify(analysis), client.id]);
      } catch {
        analysis = { churn_risk: 'unknown', health_score: 0.5, overall_notes: 'Analysis unavailable' };
      }

      scored.push({
        id: client.id,
        name: client.name,
        company: client.company,
        email: client.email,
        last_project_date: client.last_project_date,
        last_invoice_date: client.last_invoice_date,
        active_projects: parseInt(client.active_projects) || 0,
        overdue_invoices: parseInt(client.overdue_invoices) || 0,
        paid_invoices: parseInt(client.paid_invoices) || 0,
        churn_risk: analysis.churn_risk || 'unknown',
        health_score: analysis.health_score,
        health_level: analysis.health_level,
        relationship_tips: analysis.relationship_tips,
        overall_notes: analysis.overall_notes,
      });
    }

    const riskOrder = { high: 0, medium: 1, low: 2, unknown: 3 };
    scored.sort((a, b) => (riskOrder[a.churn_risk] ?? 3) - (riskOrder[b.churn_risk] ?? 3));

    res.json({ data: scored, total: scored.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
