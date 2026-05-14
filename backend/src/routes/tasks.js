import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { prioritizeTasks, estimateTaskEffort } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, project_id, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let base = `FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.user_id = $1`;
    const params = [req.user.id];
    if (search) { base += ` AND (t.title ILIKE $${params.length + 1} OR t.description ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { base += ` AND t.status = $${params.length + 1}`; params.push(status); }
    if (project_id) { base += ` AND t.project_id = $${params.length + 1}`; params.push(project_id); }

    const countResult = await pool.query(`SELECT COUNT(*) ${base}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT t.*, p.name as project_name ${base} ORDER BY t.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
      `SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = $1 AND t.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, title, description, status, priority, due_date, estimated_hours } = req.body;
    const result = await pool.query(
      'INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date, estimated_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, project_id, title, description, status || 'todo', priority || 'medium', due_date, estimated_hours]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { project_id, title, description, status, priority, due_date, estimated_hours, actual_hours } = req.body;
    const result = await pool.query(
      'UPDATE tasks SET project_id=$1, title=$2, description=$3, status=$4, priority=$5, due_date=$6, estimated_hours=$7, actual_hours=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9 AND user_id=$10 RETURNING *',
      [project_id, title, description, status, priority, due_date, estimated_hours, actual_hours, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-prioritize', async (req, res) => {
  try {
    const tasks = await pool.query('SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.user_id = $1 AND t.status != $2', [req.user.id, 'done']);
    const analysis = await prioritizeTasks(tasks.rows);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-estimate', async (req, res) => {
  try {
    const task = await pool.query('SELECT t.*, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = $1 AND t.user_id = $2', [req.params.id, req.user.id]);
    if (task.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await estimateTaskEffort(task.rows[0]);
    await pool.query('UPDATE tasks SET ai_effort_estimate = $1, ai_notes = $2 WHERE id = $3',
      [analysis.estimated_hours, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
