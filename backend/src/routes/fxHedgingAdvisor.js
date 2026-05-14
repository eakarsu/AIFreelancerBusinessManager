// Multi-currency invoicing + FX hedging advisor using the fxRates module
// to recommend markups by client geography.
// Audit: batch_04.md / AIFreelancerBusinessManager / Custom Feature Suggestions #4
import { Router } from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';
import { callAI } from '../services/openrouter.js';

const router = Router();
router.use(authenticateToken);

function safeJSON(text, fallback = 'notes') {
  if (!text) return { [fallback]: '' };
  try { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch (_) {}
  return { [fallback]: text };
}

// POST /api/fx-hedging/advise { home_currency?, horizon_days? }
router.post('/advise', aiRateLimiter, async (req, res) => {
  try {
    const { home_currency = 'USD', horizon_days = 90 } = req.body || {};
    const userId = req.user.id;

    let rates = { rows: [] };
    let invoicesByCurrency = { rows: [] };
    let clientsByCountry = { rows: [] };
    try {
      rates = await pool.query(
        `SELECT * FROM fx_rates ORDER BY created_at DESC LIMIT 100`
      );
    } catch (_) {}
    try {
      invoicesByCurrency = await pool.query(
        `SELECT currency, COUNT(*) AS count, SUM(amount) AS total
         FROM invoices WHERE user_id = $1 GROUP BY currency`,
        [userId]
      );
    } catch (_) {}
    try {
      clientsByCountry = await pool.query(
        `SELECT country, COUNT(*) AS count FROM clients WHERE user_id = $1 GROUP BY country`,
        [userId]
      );
    } catch (_) {}

    const systemPrompt = `You are a freelancer FX hedging and currency strategy advisor. Given exposure data
(invoices in various currencies, clients by country, recent FX rates), recommend:
- Per-client/country markup adjustments to absorb FX volatility.
- Simple hedging tactics (forward contracts, multi-currency holding accounts).
- Which currencies to invoice in vs avoid.
Return STRICT JSON only.`;

    const userPrompt = `Home currency: ${home_currency}
Horizon (days): ${horizon_days}
Recent FX rates (sample): ${JSON.stringify(rates.rows.slice(0, 20))}
Invoice exposure by currency: ${JSON.stringify(invoicesByCurrency.rows)}
Client distribution by country: ${JSON.stringify(clientsByCountry.rows)}

Return JSON:
{
  "summary": "...",
  "exposure_by_currency": [{ "currency": "string", "exposure_pct": 0, "trend_note": "string" }],
  "markup_recommendations": [{ "client_country_or_currency": "string", "recommended_markup_pct": 0, "rationale": "string" }],
  "hedging_tactics": [{ "tactic": "forward_contract|multicurrency_account|invoice_in_home_currency|natural_hedge", "when_to_use": "string" }],
  "currencies_to_avoid": ["..."],
  "next_review_date_days": 0,
  "disclaimer": "FX advice is approximate; consult a licensed advisor for material exposures."
}`;
    const raw = await callAI(systemPrompt, userPrompt);
    res.json({
      home_currency,
      horizon_days,
      invoice_exposure: invoicesByCurrency.rows,
      ai_analysis: safeJSON(raw)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fx-hedging/exposure - current snapshot only
router.get('/exposure', async (req, res) => {
  try {
    const userId = req.user.id;
    const r = await pool.query(
      `SELECT currency, COUNT(*) AS count, SUM(amount) AS total
       FROM invoices WHERE user_id = $1 GROUP BY currency`,
      [userId]
    ).catch(() => ({ rows: [] }));
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
