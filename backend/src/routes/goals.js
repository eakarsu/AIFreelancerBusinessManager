import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { predictGoal } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, category } = req.query;
    let query = 'SELECT * FROM goals WHERE user_id = $1';
    const params = [req.user.id];
    if (search) { query += ` AND (title ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { query += ` AND status = $${params.length + 1}`; params.push(status); }
    if (category) { query += ` AND category = $${params.length + 1}`; params.push(category); }
    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, description, category, target_value, current_value, unit, start_date, target_date, status } = req.body;
    const result = await pool.query(
      'INSERT INTO goals (user_id, title, description, category, target_value, current_value, unit, start_date, target_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [req.user.id, title, description, category, target_value, current_value || 0, unit, start_date, target_date, status || 'active']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, description, category, target_value, current_value, unit, start_date, target_date, status } = req.body;
    const result = await pool.query(
      'UPDATE goals SET title=$1, description=$2, category=$3, target_value=$4, current_value=$5, unit=$6, start_date=$7, target_date=$8, status=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10 AND user_id=$11 RETURNING *',
      [title, description, category, target_value, current_value, unit, start_date, target_date, status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-predict', async (req, res) => {
  try {
    const goal = await pool.query('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (goal.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await predictGoal(goal.rows[0]);
    await pool.query('UPDATE goals SET ai_completion_prediction = $1, ai_action_items = $2, ai_progress_notes = $3 WHERE id = $4',
      [analysis.completion_probability, JSON.stringify(analysis.action_items), JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
