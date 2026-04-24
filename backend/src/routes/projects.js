import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeProject } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.user_id = $1`;
    const params = [req.user.id];
    if (search) { query += ` AND (p.name ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { query += ` AND p.status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY p.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1 AND p.user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, client_id, status, budget, start_date, end_date, deadline, priority } = req.body;
    const result = await pool.query(
      'INSERT INTO projects (user_id, name, description, client_id, status, budget, start_date, end_date, deadline, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, name, description, client_id, status || 'active', budget, start_date, end_date, deadline, priority || 'medium']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, description, client_id, status, budget, spent, start_date, end_date, deadline, priority } = req.body;
    const result = await pool.query(
      'UPDATE projects SET name=$1, description=$2, client_id=$3, status=$4, budget=$5, spent=$6, start_date=$7, end_date=$8, deadline=$9, priority=$10, updated_at=CURRENT_TIMESTAMP WHERE id=$11 AND user_id=$12 RETURNING *',
      [name, description, client_id, status, budget, spent, start_date, end_date, deadline, priority, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-analyze', async (req, res) => {
  try {
    const result = await pool.query('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1 AND p.user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await analyzeProject(result.rows[0]);
    await pool.query('UPDATE projects SET ai_risk_score = $1, ai_scope_summary = $2, ai_recommendations = $3 WHERE id = $4',
      [analysis.risk_score, analysis.scope_summary, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
