import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeCommunication } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = `SELECT cm.*, c.name as client_name, p.name as project_name FROM communications cm LEFT JOIN clients c ON cm.client_id = c.id LEFT JOIN projects p ON cm.project_id = p.id WHERE cm.user_id = $1`;
    const params = [req.user.id];
    if (search) { query += ` AND (cm.subject ILIKE $${params.length + 1} OR cm.body ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (type) { query += ` AND cm.type = $${params.length + 1}`; params.push(type); }
    query += ' ORDER BY cm.date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cm.*, c.name as client_name, p.name as project_name FROM communications cm LEFT JOIN clients c ON cm.client_id = c.id LEFT JOIN projects p ON cm.project_id = p.id WHERE cm.id = $1 AND cm.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, project_id, subject, body, type, direction, date } = req.body;
    const result = await pool.query(
      'INSERT INTO communications (user_id, client_id, project_id, subject, body, type, direction, date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, client_id, project_id, subject, body, type || 'email', direction || 'outbound', date || new Date()]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, project_id, subject, body, type, direction, date } = req.body;
    const result = await pool.query(
      'UPDATE communications SET client_id=$1, project_id=$2, subject=$3, body=$4, type=$5, direction=$6, date=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [client_id, project_id, subject, body, type, direction, date, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM communications WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-analyze', async (req, res) => {
  try {
    const cm = await pool.query('SELECT cm.*, c.name as client_name FROM communications cm LEFT JOIN clients c ON cm.client_id = c.id WHERE cm.id = $1 AND cm.user_id = $2', [req.params.id, req.user.id]);
    if (cm.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await analyzeCommunication(cm.rows[0]);
    await pool.query('UPDATE communications SET ai_sentiment = $1, ai_summary = $2, ai_suggested_reply = $3 WHERE id = $4',
      [analysis.sentiment, analysis.summary, analysis.suggested_reply, req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
