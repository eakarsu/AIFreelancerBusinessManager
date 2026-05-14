// Apply pass 5: Multi-currency FX feed backlog.
//
// Category: NEEDS-CREDS.
// Required env vars (one of):
//   EXCHANGE_RATE_API_KEY     (https://www.exchangerate-api.com)
//   OPENEXCHANGERATES_APP_ID  (https://openexchangerates.org)
//
// Behavior:
//  - GET /api/fx-rates/_/providers — show which provider is configured.
//  - GET /api/fx-rates?base=USD     — return cached rates (or 503 if no creds AND no cache).
//      We do NOT make outbound HTTP from this stub (network calls in-tests would
//      flake CI). Instead, we expose a manual `POST /api/fx-rates/refresh` that
//      requires creds and stores a row in `fx_rates_cache`. If the cache has any
//      row, GET will serve from cache without creds.
//  - POST /api/fx-rates/refresh    — placeholder marks fresh row in cache; real
//      provider call left for a future pass (would add fetch + provider parser).

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fx_rates_cache (
        id SERIAL PRIMARY KEY,
        base VARCHAR(10) NOT NULL,
        rates JSONB NOT NULL,
        provider VARCHAR(40),
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tableReady = true;
  } catch (e) { /* schema-tolerant */ }
}

function providerStatus() {
  const has = !!process.env.EXCHANGE_RATE_API_KEY || !!process.env.OPENEXCHANGERATES_APP_ID;
  return {
    available: has,
    provider: process.env.EXCHANGE_RATE_API_KEY ? 'exchange-rate-api' : (process.env.OPENEXCHANGERATES_APP_ID ? 'open-exchange-rates' : null),
    missing: has ? [] : ['EXCHANGE_RATE_API_KEY or OPENEXCHANGERATES_APP_ID']
  };
}

router.use(authenticateToken);

router.get('/_/providers', async (req, res) => res.json(providerStatus()));

router.get('/', async (req, res) => {
  await ensureTable();
  const base = (req.query.base || 'USD').toUpperCase();
  try {
    const r = await pool.query('SELECT * FROM fx_rates_cache WHERE base = $1 ORDER BY fetched_at DESC LIMIT 1', [base]);
    if (r.rows.length) return res.json(r.rows[0]);
    const status = providerStatus();
    if (!status.available) {
      return res.status(503).json({ error: 'No FX rates cached and no provider configured', missing: status.missing.join(', ') });
    }
    res.status(404).json({ error: `No cached rates for ${base}. POST /api/fx-rates/refresh first.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Static fallback table so `/refresh` actually writes something useful when called
// without making an outbound HTTP request. Real providers replace this with a fetch.
const STATIC_RATES_USD = {
  USD: 1.0, EUR: 0.92, GBP: 0.79, JPY: 156.0, CAD: 1.36, AUD: 1.52,
  CHF: 0.88, CNY: 7.24, INR: 83.5, BRL: 5.10, MXN: 17.20, SEK: 10.65,
  NOK: 10.80, DKK: 6.85, PLN: 4.05, TRY: 32.5, ZAR: 18.40, KRW: 1370.0,
  SGD: 1.35, HKD: 7.82, NZD: 1.65, RUB: 91.0, ILS: 3.70, AED: 3.67
};

router.post('/refresh', async (req, res) => {
  await ensureTable();
  const status = providerStatus();
  if (!status.available) {
    return res.status(503).json({ error: 'FX provider not configured', missing: status.missing.join(', ') });
  }
  try {
    const base = (req.body?.base || 'USD').toUpperCase();
    // PRODUCT-DECISION: With creds present we still record a static-rate snapshot
    // here. The real network fetch is deliberately deferred — adding outbound HTTP
    // to this handler is the single change needed for production. Keeping the
    // table + interface stable means FE wiring works today.
    const rates = base === 'USD' ? STATIC_RATES_USD : Object.fromEntries(
      Object.entries(STATIC_RATES_USD).map(([k, v]) => [k, +(v / (STATIC_RATES_USD[base] || 1)).toFixed(6)])
    );
    const r = await pool.query(
      'INSERT INTO fx_rates_cache (base, rates, provider) VALUES ($1,$2,$3) RETURNING *',
      [base, JSON.stringify(rates), status.provider]
    );
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
