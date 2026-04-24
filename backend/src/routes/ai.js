import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { businessHealthCheck, aiChat } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/status', (req, res) => {
  const hasKey = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your-openrouter-api-key-here';
  res.json({
    configured: hasKey,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
  });
});

router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const clients = await pool.query('SELECT COUNT(*) as count FROM clients WHERE user_id = $1', [req.user.id]);
    const projects = await pool.query('SELECT COUNT(*) as count, SUM(budget) as total_budget FROM projects WHERE user_id = $1', [req.user.id]);
    const invoices = await pool.query('SELECT COUNT(*) as count, SUM(amount) as total FROM invoices WHERE user_id = $1', [req.user.id]);
    const context = {
      total_clients: clients.rows[0].count,
      total_projects: projects.rows[0].count,
      total_budget: projects.rows[0].total_budget,
      total_invoices: invoices.rows[0].count,
      total_invoiced: invoices.rows[0].total,
    };
    const analysis = await aiChat(message, context);
    await pool.query('INSERT INTO ai_logs (user_id, feature, input_summary, output_summary, model_used, success) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user.id, 'chat', message.substring(0, 200), JSON.stringify(analysis).substring(0, 500), process.env.OPENROUTER_MODEL, true]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/dashboard', async (req, res) => {
  try {
    const clients = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $2) as active FROM clients WHERE user_id = $1', [req.user.id, 'active']);
    const projects = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $2) as active, COALESCE(SUM(budget),0) as total_budget FROM projects WHERE user_id = $1', [req.user.id, 'active']);
    const invoices = await pool.query('SELECT COUNT(*) as total, COALESCE(SUM(amount),0) as total_amount, COUNT(*) FILTER (WHERE status = $2) as paid, COUNT(*) FILTER (WHERE status = $3) as overdue FROM invoices WHERE user_id = $1', [req.user.id, 'paid', 'overdue']);
    const tasks = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $2) as todo, COUNT(*) FILTER (WHERE status = $3) as in_progress FROM tasks WHERE user_id = $1', [req.user.id, 'todo', 'in_progress']);
    const expenses = await pool.query('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE user_id = $1', [req.user.id]);
    const goals = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = $2) as active FROM goals WHERE user_id = $1', [req.user.id, 'active']);
    res.json({
      clients: clients.rows[0],
      projects: projects.rows[0],
      invoices: invoices.rows[0],
      tasks: tasks.rows[0],
      expenses: expenses.rows[0],
      goals: goals.rows[0],
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/business-health', async (req, res) => {
  try {
    const clients = await pool.query('SELECT * FROM clients WHERE user_id = $1 LIMIT 10', [req.user.id]);
    const projects = await pool.query('SELECT * FROM projects WHERE user_id = $1 LIMIT 10', [req.user.id]);
    const invoices = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [req.user.id]);
    const reports = await pool.query('SELECT * FROM revenue_reports WHERE user_id = $1 ORDER BY period_end DESC LIMIT 6', [req.user.id]);
    const goals = await pool.query('SELECT * FROM goals WHERE user_id = $1 AND status = $2', [req.user.id, 'active']);
    const analysis = await businessHealthCheck({
      clients: clients.rows, projects: projects.rows, invoices: invoices.rows,
      reports: reports.rows, goals: goals.rows,
    });
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
