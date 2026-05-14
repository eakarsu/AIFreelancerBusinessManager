import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { analyzeProductivity } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, project_id, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `FROM time_entries te LEFT JOIN projects p ON te.project_id = p.id WHERE te.user_id = $1`;
    const params = [req.user.id];
    if (search) { baseQuery += ` AND te.description ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
    if (project_id) { baseQuery += ` AND te.project_id = $${params.length + 1}`; params.push(project_id); }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT te.*, p.name as project_name ${baseQuery} ORDER BY te.date DESC, te.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
      `SELECT te.*, p.name as project_name FROM time_entries te LEFT JOIN projects p ON te.project_id = p.id WHERE te.id = $1 AND te.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, task_id, description, hours, hourly_rate, date, billable } = req.body;
    const result = await pool.query(
      'INSERT INTO time_entries (user_id, project_id, task_id, description, hours, hourly_rate, date, billable) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, project_id, task_id, description, hours, hourly_rate, date, billable !== false]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { project_id, task_id, description, hours, hourly_rate, date, billable } = req.body;
    const result = await pool.query(
      'UPDATE time_entries SET project_id=$1, task_id=$2, description=$3, hours=$4, hourly_rate=$5, date=$6, billable=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [project_id, task_id, description, hours, hourly_rate, date, billable, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM time_entries WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-analyze', async (req, res) => {
  try {
    const entries = await pool.query('SELECT te.*, p.name as project_name FROM time_entries te LEFT JOIN projects p ON te.project_id = p.id WHERE te.user_id = $1 ORDER BY te.date DESC LIMIT 50', [req.user.id]);
    const projects = await pool.query('SELECT * FROM projects WHERE user_id = $1', [req.user.id]);
    const analysis = await analyzeProductivity(entries.rows, projects.rows);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
