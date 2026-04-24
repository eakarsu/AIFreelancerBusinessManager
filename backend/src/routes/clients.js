import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { scoreClientHealth } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM clients WHERE user_id = $1';
    const params = [req.user.id];
    if (search) { query += ` AND (name ILIKE $${params.length + 1} OR company ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
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

router.post('/:id/ai-health', async (req, res) => {
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

export default router;
