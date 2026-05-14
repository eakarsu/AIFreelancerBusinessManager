import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { predictPayment, generateInvoice } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const { search, status, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `FROM invoices i LEFT JOIN clients c ON i.client_id = c.id LEFT JOIN projects p ON i.project_id = p.id WHERE i.user_id = $1`;
    const params = [req.user.id];
    if (search) { baseQuery += ` AND (i.invoice_number ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`; params.push(`%${search}%`); }
    if (status) { baseQuery += ` AND i.status = $${params.length + 1}`; params.push(status); }

    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limitNum, offset];
    const result = await pool.query(
      `SELECT i.*, c.name as client_name, p.name as project_name ${baseQuery} ORDER BY i.created_at DESC LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
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
      `SELECT i.*, c.name as client_name, p.name as project_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id LEFT JOIN projects p ON i.project_id = p.id WHERE i.id = $1 AND i.user_id = $2`,
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { client_id, project_id, invoice_number, amount, tax, status, due_date, line_items } = req.body;
    if (!client_id || !amount) return res.status(400).json({ error: 'client_id and amount are required' });

    const result = await pool.query(
      'INSERT INTO invoices (user_id, client_id, project_id, invoice_number, amount, tax, status, due_date, line_items) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, client_id, project_id, invoice_number, amount, tax, status || 'draft', due_date, line_items]
    );
    const invoice = result.rows[0];

    // Fire-and-forget AI payment prediction
    (async () => {
      try {
        const clientRow = client_id ? (await pool.query('SELECT * FROM clients WHERE id = $1', [client_id])).rows[0] : null;
        const analysis = await predictPayment(invoice, clientRow);
        await pool.query(
          'UPDATE invoices SET ai_payment_prediction=$1, ai_notes=$2 WHERE id=$3',
          [analysis.payment_probability, JSON.stringify(analysis), invoice.id]
        );
      } catch (e) { console.error(e); }
    })();

    res.json(invoice);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { client_id, project_id, invoice_number, amount, tax, status, due_date, paid_date, line_items } = req.body;
    const result = await pool.query(
      'UPDATE invoices SET client_id=$1, project_id=$2, invoice_number=$3, amount=$4, tax=$5, status=$6, due_date=$7, paid_date=$8, line_items=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10 AND user_id=$11 RETURNING *',
      [client_id, project_id, invoice_number, amount, tax, status, due_date, paid_date, line_items, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/ai-predict', aiRateLimiter, async (req, res) => {
  try {
    const inv = await pool.query('SELECT i.*, c.name as client_name FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = $1 AND i.user_id = $2', [req.params.id, req.user.id]);
    if (inv.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const client = inv.rows[0].client_id ? (await pool.query('SELECT * FROM clients WHERE id = $1', [inv.rows[0].client_id])).rows[0] : null;
    const analysis = await predictPayment(inv.rows[0], client);
    await pool.query('UPDATE invoices SET ai_payment_prediction = $1, ai_notes = $2 WHERE id = $3', [analysis.payment_probability, JSON.stringify(analysis), req.params.id]);
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/ai-generate', aiRateLimiter, async (req, res) => {
  try {
    const { project_id } = req.body;
    const project = await pool.query('SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = $1 AND p.user_id = $2', [project_id, req.user.id]);
    if (project.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    const timeEntries = await pool.query('SELECT * FROM time_entries WHERE project_id = $1', [project_id]);
    const analysis = await generateInvoice({ ...project.rows[0], time_entries: timeEntries.rows });
    res.json(analysis);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
