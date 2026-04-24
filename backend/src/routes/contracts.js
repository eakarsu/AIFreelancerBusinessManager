import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { reviewContract } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `SELECT ct.*, c.name as client_name, p.name as project_name FROM contracts ct LEFT JOIN clients c ON ct.client_id = c.id LEFT JOIN projects p ON ct.project_id = p.id WHERE ct.user_id = $1`;
    const params = [req.user.id];
    if (search) { query += ` AND (ct.title ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { query += ` AND ct.status = $${params.length + 1}`; params.push(status); }
    query += ' ORDER BY ct.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.*, c.name as client_name, p.name as project_name FROM contracts ct LEFT JOIN clients c ON ct.client_id = c.id LEFT JOIN projects p ON ct.project_id = p.id WHERE ct.id = $1 AND ct.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, project_id, title, contract_type, value, status, start_date, end_date, key_terms } = req.body;
    const result = await pool.query(
      'INSERT INTO contracts (user_id, client_id, project_id, title, contract_type, value, status, start_date, end_date, key_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, client_id, project_id, title, contract_type, value, status || 'draft', start_date, end_date, key_terms]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, project_id, title, contract_type, value, status, start_date, end_date, key_terms } = req.body;
    const result = await pool.query(
      'UPDATE contracts SET client_id=$1, project_id=$2, title=$3, contract_type=$4, value=$5, status=$6, start_date=$7, end_date=$8, key_terms=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10 AND user_id=$11 RETURNING *',
      [client_id, project_id, title, contract_type, value, status, start_date, end_date, key_terms, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM contracts WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-review', async (req, res) => {
  try {
    const ct = await pool.query('SELECT * FROM contracts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (ct.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await reviewContract(ct.rows[0]);
    await pool.query('UPDATE contracts SET ai_risk_flags = $1, ai_summary = $2, ai_clause_analysis = $3 WHERE id = $4',
      [JSON.stringify(analysis.risk_flags), analysis.overall_assessment, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
