import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { forecastRevenue } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { report_type } = req.query;
    let query = 'SELECT * FROM revenue_reports WHERE user_id = $1';
    const params = [req.user.id];
    if (report_type) { query += ` AND report_type = $${params.length + 1}`; params.push(report_type); }
    query += ' ORDER BY period_end DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM revenue_reports WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count } = req.body;
    const result = await pool.query(
      'INSERT INTO revenue_reports (user_id, report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count } = req.body;
    const result = await pool.query(
      'UPDATE revenue_reports SET report_type=$1, period_start=$2, period_end=$3, total_revenue=$4, total_expenses=$5, net_profit=$6, invoices_count=$7, projects_count=$8 WHERE id=$9 AND user_id=$10 RETURNING *',
      [report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM revenue_reports WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-forecast', async (req, res) => {
  try {
    const reports = await pool.query('SELECT * FROM revenue_reports WHERE user_id = $1 ORDER BY period_end DESC LIMIT 12', [req.user.id]);
    const projects = await pool.query('SELECT * FROM projects WHERE user_id = $1', [req.user.id]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]);
    const analysis = await forecastRevenue(reports.rows, projects.rows, invoices.rows);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
