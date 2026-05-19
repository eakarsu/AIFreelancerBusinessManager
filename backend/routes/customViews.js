import { Router } from 'express';
import pool from '../src/config/database.js';
import { authenticateToken } from '../src/middleware/auth.js';

const router = Router();
router.use(authenticateToken);

// In-memory storage for pricing/contract rules (rate tiers, retainer rules)
// Seeded with sensible defaults; CRUD operations operate on this store per user.
const ruleStore = new Map();

function ensureUserRules(userId) {
  if (!ruleStore.has(userId)) {
    ruleStore.set(userId, {
      rateTiers: [
        { id: 'tier-1', name: 'Starter', hourlyRate: 75, minHours: 0, maxHours: 20, description: 'Small projects and quick fixes' },
        { id: 'tier-2', name: 'Standard', hourlyRate: 120, minHours: 20, maxHours: 80, description: 'Mid-size engagements' },
        { id: 'tier-3', name: 'Premium', hourlyRate: 180, minHours: 80, maxHours: 9999, description: 'Enterprise & strategic work' },
      ],
      retainerRules: [
        { id: 'ret-1', name: 'Monthly Retainer (Bronze)', monthlyAmount: 2500, includedHours: 20, overageRate: 130, autoRenew: true, noticeDays: 30 },
        { id: 'ret-2', name: 'Monthly Retainer (Silver)', monthlyAmount: 5000, includedHours: 45, overageRate: 115, autoRenew: true, noticeDays: 30 },
      ],
    });
  }
  return ruleStore.get(userId);
}

function escapeXml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapePdf(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// ==========================================
// VIZ 1: Revenue per client (bar chart data)
// ==========================================
router.get('/revenue-per-client', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.company,
              COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0)::float AS paid_revenue,
              COALESCE(SUM(CASE WHEN i.status IN ('sent','overdue') THEN i.amount ELSE 0 END), 0)::float AS outstanding,
              COALESCE(SUM(i.amount), 0)::float AS total_billed,
              COUNT(i.id)::int AS invoice_count
         FROM clients c
         LEFT JOIN invoices i ON i.client_id = c.id AND i.user_id = $1
         WHERE c.user_id = $1
         GROUP BY c.id, c.name, c.company
         ORDER BY paid_revenue DESC
         LIMIT 50`,
      [req.user.id]
    );

    const total = rows.reduce((acc, r) => acc + Number(r.paid_revenue || 0), 0);
    const chartData = rows.map(r => ({
      clientId: r.id,
      label: r.company || r.name,
      paid: Number(r.paid_revenue || 0),
      outstanding: Number(r.outstanding || 0),
      total: Number(r.total_billed || 0),
      invoices: r.invoice_count,
      share: total > 0 ? Number(r.paid_revenue || 0) / total : 0,
    }));

    res.json({
      kind: 'bar-chart',
      title: 'Revenue per Client',
      xKey: 'label',
      yKeys: ['paid', 'outstanding'],
      totalRevenue: total,
      clientCount: rows.length,
      data: chartData,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// VIZ 2: Project profitability heatmap (project x month)
// ==========================================
router.get('/project-profitability-heatmap', async (req, res) => {
  try {
    const projects = await pool.query(
      `SELECT id, name, budget, spent, start_date, end_date
         FROM projects WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );

    // Build month buckets for the last 6 months
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      });
    }

    const monthKeys = months.map(m => m.key);
    const rows = [];

    for (const p of projects.rows) {
      // Aggregate invoiced revenue per month
      const invByMonth = await pool.query(
        `SELECT TO_CHAR(COALESCE(paid_date, due_date, created_at), 'YYYY-MM') AS m,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0)::float AS revenue
           FROM invoices WHERE project_id = $1 AND user_id = $2
           GROUP BY m`,
        [p.id, req.user.id]
      );
      const expByMonth = await pool.query(
        `SELECT TO_CHAR(date, 'YYYY-MM') AS m,
                COALESCE(SUM(amount), 0)::float AS cost
           FROM expenses WHERE project_id = $1 AND user_id = $2
           GROUP BY m`,
        [p.id, req.user.id]
      );

      const revMap = Object.fromEntries(invByMonth.rows.map(r => [r.m, Number(r.revenue)]));
      const costMap = Object.fromEntries(expByMonth.rows.map(r => [r.m, Number(r.cost)]));

      const cells = monthKeys.map(k => {
        const rev = revMap[k] || 0;
        const cost = costMap[k] || 0;
        const profit = rev - cost;
        return { month: k, revenue: rev, cost, profit };
      });

      const totalProfit = cells.reduce((s, c) => s + c.profit, 0);

      rows.push({
        projectId: p.id,
        project: p.name,
        budget: Number(p.budget || 0),
        spent: Number(p.spent || 0),
        totalProfit,
        cells,
      });
    }

    // Compute min/max profit for color scaling
    let min = Infinity, max = -Infinity;
    for (const r of rows) for (const c of r.cells) {
      if (c.profit < min) min = c.profit;
      if (c.profit > max) max = c.profit;
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 0;

    res.json({
      kind: 'heatmap',
      title: 'Project Profitability (Last 6 Months)',
      xAxis: months,
      yAxis: rows.map(r => ({ id: r.projectId, label: r.project })),
      scale: { min, max },
      rows,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NON-VIZ 1: Client invoice PDF
// GET /invoice-pdf/:invoiceId returns a minimal valid PDF
// ==========================================
router.get('/invoice-pdf/:invoiceId', async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.invoiceId, 10);
    if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' });

    const invRes = await pool.query(
      `SELECT i.*, c.name AS client_name, c.company AS client_company, c.email AS client_email,
              p.name AS project_name
         FROM invoices i
         LEFT JOIN clients c ON c.id = i.client_id
         LEFT JOIN projects p ON p.id = i.project_id
         WHERE i.id = $1 AND i.user_id = $2`,
      [invoiceId, req.user.id]
    );
    if (invRes.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });
    const inv = invRes.rows[0];

    const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0] || { name: 'Freelancer', email: '' };

    const total = (Number(inv.amount) || 0) + (Number(inv.tax) || 0);
    const lines = [
      `Invoice ${inv.invoice_number}`,
      ``,
      `From: ${user.name}  ${user.email ? '<' + user.email + '>' : ''}`,
      `To:   ${inv.client_name || ''}${inv.client_company ? ' / ' + inv.client_company : ''}`,
      inv.client_email ? `      ${inv.client_email}` : '',
      ``,
      `Project: ${inv.project_name || 'N/A'}`,
      `Status:  ${inv.status}`,
      `Due:     ${inv.due_date ? new Date(inv.due_date).toISOString().slice(0, 10) : 'N/A'}`,
      inv.paid_date ? `Paid:    ${new Date(inv.paid_date).toISOString().slice(0, 10)}` : '',
      ``,
      `Amount:  $${Number(inv.amount || 0).toFixed(2)}`,
      `Tax:     $${Number(inv.tax || 0).toFixed(2)}`,
      `------------------------------`,
      `Total:   $${total.toFixed(2)}`,
      ``,
      `Generated: ${new Date().toISOString()}`,
    ].filter(Boolean);

    // Build a minimal PDF by hand (works for plain text demo invoices)
    let textStream = 'BT\n/F1 12 Tf\n50 780 Td\n14 TL\n';
    lines.forEach((line, idx) => {
      const safe = escapePdf(line);
      if (idx === 0) {
        textStream += `(${safe}) Tj\n`;
      } else {
        textStream += `T*\n(${safe}) Tj\n`;
      }
    });
    textStream += 'ET\n';

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
    objects.push(`<< /Length ${Buffer.byteLength(textStream, 'utf8')} >>\nstream\n${textStream}endstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((obj, i) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(off => {
      pdf += String(off).padStart(10, '0') + ' 00000 n \n';
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${inv.invoice_number}.pdf"`);
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auxiliary listing for the PDF UI — list invoices for selection
router.get('/invoices-for-pdf', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT i.id, i.invoice_number, i.amount, i.tax, i.status, i.due_date,
              c.name AS client_name, c.company AS client_company
         FROM invoices i
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.user_id = $1
         ORDER BY i.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ data: rows, total: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// NON-VIZ 2: Pricing / contract rules editor (CRUD)
// Operates on in-memory store seeded per user.
// ==========================================
router.get('/pricing-rules', (req, res) => {
  const rules = ensureUserRules(req.user.id);
  res.json({
    rateTiers: rules.rateTiers,
    retainerRules: rules.retainerRules,
    summary: {
      tierCount: rules.rateTiers.length,
      retainerCount: rules.retainerRules.length,
      minTierRate: rules.rateTiers.reduce((m, t) => Math.min(m, t.hourlyRate), Infinity),
      maxTierRate: rules.rateTiers.reduce((m, t) => Math.max(m, t.hourlyRate), -Infinity),
    },
  });
});

router.post('/pricing-rules', (req, res) => {
  try {
    const rules = ensureUserRules(req.user.id);
    const { kind, item } = req.body || {};
    if (!kind || !item) return res.status(400).json({ error: 'kind and item required' });

    if (kind === 'rateTier') {
      const newItem = {
        id: `tier-${Date.now()}`,
        name: item.name || 'New Tier',
        hourlyRate: Number(item.hourlyRate) || 0,
        minHours: Number(item.minHours) || 0,
        maxHours: Number(item.maxHours) || 9999,
        description: item.description || '',
      };
      rules.rateTiers.push(newItem);
      return res.json({ created: newItem });
    }
    if (kind === 'retainer') {
      const newItem = {
        id: `ret-${Date.now()}`,
        name: item.name || 'New Retainer',
        monthlyAmount: Number(item.monthlyAmount) || 0,
        includedHours: Number(item.includedHours) || 0,
        overageRate: Number(item.overageRate) || 0,
        autoRenew: item.autoRenew !== false,
        noticeDays: Number(item.noticeDays) || 30,
      };
      rules.retainerRules.push(newItem);
      return res.json({ created: newItem });
    }
    res.status(400).json({ error: 'unknown kind' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pricing-rules/:id', (req, res) => {
  try {
    const rules = ensureUserRules(req.user.id);
    const id = req.params.id;
    let target = rules.rateTiers.find(t => t.id === id);
    let bucket = 'rateTier';
    if (!target) { target = rules.retainerRules.find(r => r.id === id); bucket = 'retainer'; }
    if (!target) return res.status(404).json({ error: 'Rule not found' });
    Object.assign(target, req.body || {}, { id });
    res.json({ updated: target, bucket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pricing-rules/:id', (req, res) => {
  try {
    const rules = ensureUserRules(req.user.id);
    const id = req.params.id;
    const t0 = rules.rateTiers.length;
    rules.rateTiers = rules.rateTiers.filter(t => t.id !== id);
    const r0 = rules.retainerRules.length;
    rules.retainerRules = rules.retainerRules.filter(r => r.id !== id);
    if (rules.rateTiers.length === t0 && rules.retainerRules.length === r0) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ deleted: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
