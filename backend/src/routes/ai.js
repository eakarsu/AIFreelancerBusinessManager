import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { businessHealthCheck, aiChat, scoreClientHealth, predictPayment, callAI } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

router.get('/status', (req, res) => {
  const hasKey = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your-openrouter-api-key-here';
  res.json({
    configured: hasKey,
    model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
  });
});

router.post('/chat', aiRateLimiter, async (req, res) => {
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

router.post('/business-health', aiRateLimiter, async (req, res) => {
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

// Smart invoice reminder — returns draft email, does NOT send
router.post('/invoice-reminder', aiRateLimiter, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    if (!invoice_id) return res.status(400).json({ error: 'invoice_id is required' });

    const invResult = await pool.query(
      `SELECT i.*, c.name as client_name, c.email as client_email, c.company
       FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1 AND i.user_id = $2`,
      [invoice_id, req.user.id]
    );
    if (invResult.rows.length === 0) return res.status(404).json({ error: 'Invoice not found' });

    const invoice = invResult.rows[0];
    const prediction = invoice.ai_payment_prediction
      ? (typeof invoice.ai_payment_prediction === 'string'
          ? parseFloat(invoice.ai_payment_prediction)
          : invoice.ai_payment_prediction)
      : null;

    const aiNotes = invoice.ai_notes ? (typeof invoice.ai_notes === 'string' ? JSON.parse(invoice.ai_notes) : invoice.ai_notes) : {};
    const predictedDays = aiNotes.predicted_days_to_payment || null;
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const daysUntilDue = dueDate ? Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const likelyLate = (predictedDays && daysUntilDue !== null && predictedDays > daysUntilDue) || (prediction !== null && prediction < 0.5);

    const systemPrompt = `You are an expert business communication AI. Generate a professional, personalized invoice follow-up email. Return JSON:
{
  "subject": "email subject line",
  "body": "full email body text with proper paragraphs",
  "send_date": "YYYY-MM-DD recommended send date",
  "tone": "friendly/firm/urgent",
  "key_message": "core message of the email"
}`;

    const userPrompt = `Generate a follow-up email for this invoice:
Invoice #${invoice.invoice_number || invoice.id}
Amount: $${invoice.amount}
Due date: ${invoice.due_date || 'not set'}
Status: ${invoice.status}
Client: ${invoice.client_name || 'Client'} (${invoice.company || ''})
Client email: ${invoice.client_email || 'unknown'}
Payment prediction score: ${prediction !== null ? prediction : 'not available'}
Likely to pay late: ${likelyLate ? 'YES - write a gentle but firm reminder' : 'NO - write a friendly early reminder'}
${aiNotes.recommendations ? 'AI payment notes: ' + JSON.stringify(aiNotes.recommendations) : ''}`;

    const result = await callAI(systemPrompt, userPrompt);
    let parsed;
    try {
      const match = result.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { subject: 'Invoice Follow-up', body: result, send_date: new Date().toISOString().split('T')[0] };
    } catch {
      parsed = { subject: 'Invoice Follow-up', body: result, send_date: new Date().toISOString().split('T')[0] };
    }

    res.json({ ...parsed, invoice_id, likely_late: likelyLate });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Tax report — fetches expenses + revenue, calls AI for Schedule C summary
router.get('/tax-report', aiRateLimiter, async (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const startDate = `${targetYear}-01-01`;
    const endDate = `${targetYear}-12-31`;

    const expenses = await pool.query(
      `SELECT * FROM expenses WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC`,
      [req.user.id, startDate, endDate]
    );
    const revenue = await pool.query(
      `SELECT * FROM revenue_reports WHERE user_id = $1 AND period_start >= $2 AND period_end <= $3 ORDER BY period_start ASC`,
      [req.user.id, startDate, endDate]
    );
    const invoices = await pool.query(
      `SELECT * FROM invoices WHERE user_id = $1 AND status = 'paid' AND paid_date >= $2 AND paid_date <= $3`,
      [req.user.id, startDate, endDate]
    );

    const totalRevenue = invoices.rows.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    const deductibleExpenses = expenses.rows.filter(e => e.tax_deductible);
    const totalDeductible = deductibleExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    const totalExpenses = expenses.rows.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const systemPrompt = `You are a tax preparation AI for self-employed freelancers. Analyze income and expenses and generate a Schedule C summary. Return JSON:
{
  "schedule_c_summary": {
    "gross_receipts": number,
    "total_expenses": number,
    "net_profit_or_loss": number,
    "self_employment_tax_estimate": number
  },
  "expense_categories": [{"category": "name", "total": number, "deductible_pct": number, "deductible_amount": number}],
  "tax_tips": ["tip 1", "tip 2"],
  "estimated_quarterly_tax": number,
  "missed_deductions": ["potential deduction you may have missed"],
  "notes": "2-3 sentence tax summary"
}`;

    const userPrompt = `Tax year: ${targetYear}
Total gross revenue: $${totalRevenue.toFixed(2)}
Total expenses: $${totalExpenses.toFixed(2)}
Tax-deductible expenses: $${totalDeductible.toFixed(2)}

Expense breakdown by category:
${JSON.stringify(
  expenses.rows.reduce((acc, e) => {
    const cat = e.category || 'Other';
    if (!acc[cat]) acc[cat] = { total: 0, deductible: 0 };
    acc[cat].total += parseFloat(e.amount || 0);
    if (e.tax_deductible) acc[cat].deductible += parseFloat(e.amount || 0);
    return acc;
  }, {}),
  null, 2
)}

Revenue reports: ${JSON.stringify(revenue.rows.map(r => ({ period: r.period_start + ' to ' + r.period_end, revenue: r.total_revenue, expenses: r.total_expenses, profit: r.net_profit })))}`;

    const aiResult = await callAI(systemPrompt, userPrompt);
    let parsed;
    try {
      const match = aiResult.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { notes: aiResult };
    } catch {
      parsed = { notes: aiResult };
    }

    res.json({
      year: targetYear,
      summary: {
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        total_deductible: totalDeductible,
        net_income: totalRevenue - totalDeductible,
      },
      expense_count: expenses.rows.length,
      deductible_count: deductibleExpenses.length,
      ai_analysis: parsed,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Project profitability analysis
router.post('/project-profitability', aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await pool.query(
      `SELECT p.id, p.name, p.budget, p.client_id, c.name AS client_name,
              COALESCE(SUM(te.hours * te.hourly_rate), 0) AS billed,
              COALESCE((SELECT SUM(amount) FROM expenses e WHERE e.project_id = p.id), 0) AS expenses
       FROM projects p
       LEFT JOIN clients c ON c.id = p.client_id
       LEFT JOIN time_entries te ON te.project_id = p.id
       WHERE p.user_id = $1
       GROUP BY p.id, c.name
       ORDER BY p.id DESC
       LIMIT 200`,
      [userId]
    );

    const enriched = projects.rows.map(r => {
      const billed = parseFloat(r.billed || 0);
      const expenses = parseFloat(r.expenses || 0);
      const budget = parseFloat(r.budget || 0);
      const profit = billed - expenses;
      const margin = billed > 0 ? (profit / billed) * 100 : null;
      return {
        project_id: r.id,
        project_name: r.name,
        client_id: r.client_id,
        client_name: r.client_name,
        budget,
        billed,
        expenses,
        profit,
        margin_pct: margin !== null ? parseFloat(margin.toFixed(2)) : null,
      };
    });

    const systemPrompt = 'You are a freelancer business advisor. Explain margin variation, flag underperforming clients/project types, and recommend pricing/scope adjustments. Return STRICT JSON.';
    const userPrompt = `Project profitability data: ${JSON.stringify(enriched)}

Return JSON:
{
  "summary": "...",
  "top_profitable_projects": [{ "project_id": 0, "project_name": "string", "margin_pct": 0 }],
  "underperformers": [{ "project_id": 0, "project_name": "string", "margin_pct": 0, "issue": "string" }],
  "client_level_insights": [{ "client_id": 0, "client_name": "string", "avg_margin_pct": 0, "recommendation": "string" }],
  "rate_or_scope_recommendations": ["..."],
  "disclaimer": "Not financial advice."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    let parsed;
    try {
      const m = aiResult.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { notes: aiResult };
    } catch { parsed = { notes: aiResult }; }

    res.json({ project_count: enriched.length, projects: enriched, ai_analysis: parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rate optimization
router.post('/rate-optimization', aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { skill, region, target_utilization_pct = 70 } = req.body || {};

    const timeEntries = await pool.query(
      `SELECT skill, AVG(hourly_rate) AS avg_rate, SUM(hours) AS total_hours
       FROM time_entries
       WHERE user_id = $1
       GROUP BY skill
       ORDER BY total_hours DESC
       LIMIT 20`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const recentInvoices = await pool.query(
      `SELECT amount, status, created_at, paid_at FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a freelancer pricing strategist. Recommend hourly-rate adjustments per skill based on current rates, demand signals, and a target utilization. Return STRICT JSON only.';
    const userPrompt = `Skill filter: ${skill || 'all'}; Region: ${region || 'unspecified'}; Target utilization: ${target_utilization_pct}%.

Current rates by skill: ${JSON.stringify(timeEntries.rows)}
Recent invoices (sample): ${JSON.stringify(recentInvoices.rows.slice(0, 20))}

Return JSON:
{
  "summary": "...",
  "suggestions": [
    { "skill": "string", "current_rate": 0, "suggested_rate": 0, "rationale": "string", "expected_demand_impact": "string" }
  ],
  "premium_skills": ["..."],
  "warning_signs": ["..."],
  "disclaimer": "Market estimate; verify with peers and job board data."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    let parsed;
    try {
      const m = aiResult.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { notes: aiResult };
    } catch { parsed = { notes: aiResult }; }

    res.json({ ai_analysis: parsed, inputs: { skill, region, target_utilization_pct } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Client churn prediction
router.post('/client-churn', aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;

    const clients = await pool.query(
      `SELECT c.id, c.name, c.created_at,
              COUNT(DISTINCT p.id) AS project_count,
              MAX(p.created_at) AS last_project_at,
              COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices,
              COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('overdue','unpaid')) AS unpaid_invoices,
              MAX(comm.created_at) AS last_communication_at
       FROM clients c
       LEFT JOIN projects p ON p.client_id = c.id
       LEFT JOIN invoices i ON i.client_id = c.id
       LEFT JOIN communications comm ON comm.client_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.id DESC
       LIMIT 200`,
      [userId]
    );

    const now = Date.now();
    const enriched = clients.rows.map(c => {
      const daysSinceProject = c.last_project_at ? Math.floor((now - new Date(c.last_project_at).getTime()) / 86400000) : 9999;
      const daysSinceComm = c.last_communication_at ? Math.floor((now - new Date(c.last_communication_at).getTime()) / 86400000) : 9999;
      let risk = 'low';
      if (daysSinceProject > 180 || daysSinceComm > 90 || parseInt(c.unpaid_invoices, 10) > 1) risk = 'medium';
      if (daysSinceProject > 365 || daysSinceComm > 180 || parseInt(c.unpaid_invoices, 10) > 3) risk = 'high';
      return { ...c, days_since_project: daysSinceProject, days_since_communication: daysSinceComm, local_risk: risk };
    });

    const systemPrompt = 'You are a freelancer client-success advisor. Use the supplied data to assign churn risk and suggest retention actions. Return STRICT JSON only.';
    const userPrompt = `Clients: ${JSON.stringify(enriched.slice(0, 100))}

Return JSON:
{
  "summary": "...",
  "high_risk": [{ "client_id": 0, "client_name": "string", "reason": "string", "retention_actions": ["..."] }],
  "medium_risk": [{ "client_id": 0, "client_name": "string", "reason": "string" }],
  "general_recommendations": ["..."],
  "disclaimer": "..."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    let parsed;
    try {
      const m = aiResult.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { notes: aiResult };
    } catch { parsed = { notes: aiResult }; }

    res.json({ clients: enriched, ai_analysis: parsed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============================================================
// Apply pass 4 (mechanical backlog) — 5 new AI endpoints
// All return 503 when OPENROUTER_API_KEY is missing.
// ============================================================

function requireKey(res) {
  const k = process.env.OPENROUTER_API_KEY;
  if (!k || k === 'your-openrouter-api-key-here') {
    res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY in .env to enable this feature.' });
    return true;
  }
  return false;
}

function safeParseJson(text, fallbackKey = 'notes') {
  if (!text) return { [fallbackKey]: '' };
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (_) {}
  return { [fallbackKey]: text };
}

// Skill gap identifier — uses time_entries skills + tasks/projects history.
router.post('/skill-gap-identifier', aiRateLimiter, async (req, res) => {
  if (requireKey(res)) return;
  try {
    const userId = req.user.id;
    const { goal_role, current_skills } = req.body || {};

    const skillRows = await pool.query(
      `SELECT skill, SUM(hours) AS total_hours, AVG(hourly_rate) AS avg_rate
       FROM time_entries WHERE user_id = $1 AND skill IS NOT NULL
       GROUP BY skill ORDER BY total_hours DESC LIMIT 30`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const recentProjects = await pool.query(
      `SELECT name, description, status FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a career-development advisor for freelancers. Identify skill gaps between current portfolio and a target role. Return STRICT JSON only.';
    const userPrompt = `Target role / direction: ${goal_role || 'better-paying client work in the same field'}
Self-reported current skills (optional): ${current_skills || 'use derived skills below'}

Time-entry skills (with hours and avg rate):
${JSON.stringify(skillRows.rows)}

Recent projects:
${JSON.stringify(recentProjects.rows)}

Return JSON:
{
  "summary": "...",
  "current_strengths": ["..."],
  "skill_gaps": [{ "skill": "string", "priority": "low|medium|high", "why": "string", "expected_rate_uplift_pct": 0 }],
  "learning_plan": [{ "skill": "string", "weeks": 0, "resources": ["..."] }],
  "portfolio_actions": ["..."],
  "disclaimer": "Estimates only; rate uplift varies."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: safeParseJson(aiResult), inputs: { goal_role, derived_skills_count: skillRows.rows.length } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cash-flow simulator — projects payment-likelihood and runway from invoices+expenses.
router.post('/cash-flow-simulator', aiRateLimiter, async (req, res) => {
  if (requireKey(res)) return;
  try {
    const userId = req.user.id;
    const { horizon_weeks = 12, monthly_fixed_costs = 0, scenario } = req.body || {};

    const invoices = await pool.query(
      `SELECT id, amount, status, due_date, created_at, paid_at FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const expensesAgg = await pool.query(
      `SELECT date_trunc('month', date) AS month, SUM(amount) AS total
       FROM expenses WHERE user_id = $1 GROUP BY 1 ORDER BY 1 DESC LIMIT 6`,
      [userId]
    ).catch(() => ({ rows: [] }));

    const systemPrompt = 'You are a cash-flow advisor for freelancers. Simulate weekly inflow/outflow. Return STRICT JSON only.';
    const userPrompt = `Horizon: ${horizon_weeks} weeks. Monthly fixed costs (estimated): ${monthly_fixed_costs}. Scenario: ${scenario || 'baseline'}.

Invoices: ${JSON.stringify(invoices.rows.slice(0, 50))}
Recent expense totals (monthly): ${JSON.stringify(expensesAgg.rows)}

Return JSON:
{
  "summary": "...",
  "weekly_projection": [{ "week_offset": 0, "expected_inflow": 0, "expected_outflow": 0, "ending_balance_delta": 0 }],
  "runway_weeks": 0,
  "warnings": ["..."],
  "actions": ["..."],
  "assumptions": ["..."],
  "disclaimer": "Estimates only; not financial advice."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: safeParseJson(aiResult), inputs: { horizon_weeks, monthly_fixed_costs, scenario } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Contract risk scanner — pastes-in / specifies a contract or contract id, gets red flags.
router.post('/contract-risk-scanner', aiRateLimiter, async (req, res) => {
  if (requireKey(res)) return;
  try {
    const userId = req.user.id;
    const { contract_id, contract_text } = req.body || {};
    let contract = null;

    if (contract_id) {
      const r = await pool.query(`SELECT * FROM contracts WHERE id = $1 AND user_id = $2`, [contract_id, userId]).catch(() => ({ rows: [] }));
      contract = r.rows[0] || null;
    }
    const text = contract_text || contract?.content || contract?.terms || '';
    if (!text) return res.status(400).json({ error: 'Provide contract_text or a valid contract_id.' });

    const systemPrompt = 'You are a contract-risk reviewer for freelancers. NOT a lawyer. Identify clauses that put a freelancer at risk and recommend amendments. Return STRICT JSON only.';
    const userPrompt = `Contract text (truncated to 12k chars):
${text.slice(0, 12000)}

Return JSON:
{
  "summary": "...",
  "risk_score": 0,
  "high_risk_clauses": [{ "clause": "string", "issue": "string", "suggested_amendment": "string" }],
  "missing_clauses": ["..."],
  "favorable_terms": ["..."],
  "negotiation_priorities": ["..."],
  "disclaimer": "This is not legal advice. Consult a licensed attorney before signing."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: safeParseJson(aiResult), contract_id: contract?.id || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Proposal generator — structured proposal from a brief.
router.post('/proposal-generator', aiRateLimiter, async (req, res) => {
  if (requireKey(res)) return;
  try {
    const { client_name, brief, scope_summary, budget_range, timeline_weeks, tone } = req.body || {};
    if (!brief) return res.status(400).json({ error: 'Provide a project brief.' });

    const systemPrompt = 'You are a proposal-writing assistant for freelancers. Produce a winning, concise proposal. Return STRICT JSON only.';
    const userPrompt = `Client: ${client_name || 'prospect'}
Brief: ${brief}
Scope summary: ${scope_summary || 'derive from brief'}
Budget range: ${budget_range || 'flexible'}
Target timeline (weeks): ${timeline_weeks || 'open'}
Tone: ${tone || 'professional and warm'}

Return JSON:
{
  "title": "string",
  "executive_summary": "string",
  "scope_of_work": ["..."],
  "deliverables": ["..."],
  "milestones": [{ "name": "string", "weeks_from_kickoff": 0, "deliverable": "string" }],
  "pricing": { "type": "fixed|hourly|retainer", "amount": 0, "rationale": "string" },
  "assumptions": ["..."],
  "out_of_scope": ["..."],
  "next_steps": ["..."],
  "win_probability": 0
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: safeParseJson(aiResult, 'executive_summary') });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Peer benchmarking — compares the user's stats vs typical-freelancer benchmarks (LLM-knowledge-based).
router.post('/peer-benchmarking', aiRateLimiter, async (req, res) => {
  if (requireKey(res)) return;
  try {
    const userId = req.user.id;
    const { discipline, region, years_experience } = req.body || {};

    const stats = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM clients WHERE user_id = $1) AS active_clients,
         (SELECT COALESCE(SUM(hours),0) FROM time_entries WHERE user_id = $1 AND created_at > NOW() - INTERVAL '90 days') AS hours_90d,
         (SELECT COALESCE(SUM(amount),0) FROM invoices WHERE user_id = $1 AND status = 'paid' AND created_at > NOW() - INTERVAL '90 days') AS revenue_90d,
         (SELECT COALESCE(AVG(hourly_rate),0) FROM time_entries WHERE user_id = $1 AND created_at > NOW() - INTERVAL '180 days') AS avg_rate_180d`,
      [userId]
    ).catch(() => ({ rows: [{}] }));

    const me = stats.rows[0] || {};
    const systemPrompt = 'You are a freelancer benchmarking analyst. Compare a freelancer to typical peers in their stated discipline/region/experience and surface percentile gaps. Use general knowledge to estimate peer benchmarks. Return STRICT JSON only.';
    const userPrompt = `Freelancer profile:
- Discipline: ${discipline || 'general freelancer'}
- Region: ${region || 'unspecified'}
- Years experience: ${years_experience || 'unspecified'}
- Active clients: ${me.active_clients}
- Hours billed (last 90 days): ${me.hours_90d}
- Revenue (last 90 days, paid): ${me.revenue_90d}
- Avg hourly rate (last 180 days): ${me.avg_rate_180d}

Return JSON:
{
  "summary": "...",
  "peer_percentiles": { "rate": 0, "utilization": 0, "client_count": 0, "revenue": 0 },
  "areas_above_peers": ["..."],
  "areas_below_peers": ["..."],
  "actionable_levers": ["..."],
  "disclaimer": "Benchmarks are estimates from general industry knowledge, not a real survey."
}`;
    const aiResult = await callAI(systemPrompt, userPrompt);
    res.json({ ai_analysis: safeParseJson(aiResult), my_stats: me });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
