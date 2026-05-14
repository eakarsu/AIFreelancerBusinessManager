import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { categorizeExpense } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, category, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let base = `FROM expenses e LEFT JOIN projects p ON e.project_id = p.id WHERE e.user_id = $1`;
    const params = [req.user.id];
    if (search) { base += ` AND e.description ILIKE $${params.length + 1}`; params.push(`%${search}%`); }
    if (category) { base += ` AND e.category = $${params.length + 1}`; params.push(category); }

    const countResult = await pool.query(`SELECT COUNT(*) ${base}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT e.*, p.name as project_name ${base} ORDER BY e.date DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
    const result = await pool.query('SELECT e.*, p.name as project_name FROM expenses e LEFT JOIN projects p ON e.project_id = p.id WHERE e.id = $1 AND e.user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { project_id, description, amount, category, date, receipt_url, tax_deductible } = req.body;
    const result = await pool.query(
      'INSERT INTO expenses (user_id, project_id, description, amount, category, date, receipt_url, tax_deductible) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [req.user.id, project_id, description, amount, category, date, receipt_url, tax_deductible || false]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { project_id, description, amount, category, date, receipt_url, tax_deductible } = req.body;
    const result = await pool.query(
      'UPDATE expenses SET project_id=$1, description=$2, amount=$3, category=$4, date=$5, receipt_url=$6, tax_deductible=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8 AND user_id=$9 RETURNING *',
      [project_id, description, amount, category, date, receipt_url, tax_deductible, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-categorize', async (req, res) => {
  try {
    const exp = await pool.query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (exp.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const analysis = await categorizeExpense(exp.rows[0]);
    await pool.query('UPDATE expenses SET ai_category_suggestion = $1, ai_tax_notes = $2 WHERE id = $3',
      [analysis.suggested_category, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
