// Apply pass 5: International payments backlog.
//
// Category: NEEDS-CREDS (Stripe / Wise).
// Required env vars (per provider, only one needs to be set):
//   STRIPE_SECRET_KEY
//   WISE_API_TOKEN, WISE_PROFILE_ID
//
// We do NOT add the Stripe SDK or Wise SDK as deps. Instead, we:
//   1. Persist a "payment intent" row to `payment_intents` (CREATE TABLE IF NOT EXISTS).
//   2. Return 503 with `missing: <ENV>` if no provider creds are set.
//   3. Return 200 with a stubbed `provider_intent_id` if creds ARE set, but no
//      outbound HTTP call is made — that wiring is left for a follow-up because
//      it requires the SDK + webhook secret rotation (out of scope for this pass).
//
// Endpoints (auth):
//   POST /api/payments/intents       — create a payment intent (returns 503 if no creds)
//   GET  /api/payments/intents       — list
//   GET  /api/payments/intents/:id
//   GET  /api/payments/_/providers   — provider availability

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_intents (
        id SERIAL PRIMARY KEY,
        user_id INT,
        invoice_id INT,
        provider VARCHAR(20) NOT NULL,
        provider_intent_id VARCHAR(255),
        amount NUMERIC(12,2) NOT NULL,
        currency VARCHAR(10) NOT NULL,
        status VARCHAR(30) DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tableReady = true;
  } catch (e) { /* schema-tolerant */ }
}

function providerStatus() {
  return {
    stripe: !!process.env.STRIPE_SECRET_KEY,
    wise: !!(process.env.WISE_API_TOKEN && process.env.WISE_PROFILE_ID),
    missing: {
      stripe: !process.env.STRIPE_SECRET_KEY ? ['STRIPE_SECRET_KEY'] : [],
      wise: ['WISE_API_TOKEN', 'WISE_PROFILE_ID'].filter(k => !process.env[k])
    }
  };
}

router.use(authenticateToken);

router.get('/_/providers', async (req, res) => res.json(providerStatus()));

router.get('/intents', async (req, res) => {
  await ensureTable();
  try {
    const r = await pool.query('SELECT * FROM payment_intents WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 200', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

router.get('/intents/:id', async (req, res) => {
  await ensureTable();
  try {
    const r = await pool.query('SELECT * FROM payment_intents WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/intents', async (req, res) => {
  await ensureTable();
  try {
    const { provider = 'stripe', amount, currency = 'USD', invoice_id, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount required' });

    const status = providerStatus();
    if (provider === 'stripe' && !status.stripe) {
      return res.status(503).json({ error: 'Stripe not configured', missing: 'STRIPE_SECRET_KEY' });
    }
    if (provider === 'wise' && !status.wise) {
      return res.status(503).json({ error: 'Wise not configured', missing: status.missing.wise.join(', ') });
    }
    if (provider !== 'stripe' && provider !== 'wise') {
      return res.status(400).json({ error: "provider must be 'stripe' or 'wise'" });
    }

    // Creds present — record an intent. We deliberately don't call the provider HTTP
    // API here (would require the SDK + a webhook secret + idempotency key strategy).
    const stubId = `${provider}_intent_${Date.now()}`;
    const r = await pool.query(
      `INSERT INTO payment_intents (user_id, invoice_id, provider, provider_intent_id, amount, currency, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING *`,
      [req.user.id, invoice_id || null, provider, stubId, amount, currency, notes || null]
    );
    res.status(201).json({ intent: r.rows[0], note: 'Intent recorded. Provider HTTP call requires SDK wiring (out of scope for this pass).' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
