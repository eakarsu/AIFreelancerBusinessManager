// Apply pass 5: Vendor / subcontractor model.
//
// Category: NEEDS-PRODUCT-DECISION.
// PRODUCT-DECISION: Default to a flat `vendors` table with optional rate cards.
// Picked the simpler "1099/sub-contractor directory" shape over a full
// procurement model (POs, RFQs, GR/IR matching). This unblocks the FE backlog
// item from the audit while keeping room for a richer purchase-order flow
// later (would add `purchase_orders` + `vendor_rate_cards` tables; the
// `vendors` schema below is forward-compatible).
//
// Endpoints (all behind authenticateToken):
//   GET    /api/vendors          — list
//   POST   /api/vendors          — create
//   GET    /api/vendors/:id
//   PUT    /api/vendors/:id
//   DELETE /api/vendors/:id

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255),
        email TEXT,
        phone VARCHAR(50),
        services TEXT,
        default_rate NUMERIC(10,2),
        rate_unit VARCHAR(20) DEFAULT 'hour',
        currency VARCHAR(10) DEFAULT 'USD',
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tableReady = true;
  } catch (e) { /* schema-tolerant */ }
}

router.use(authenticateToken);

router.get('/', async (req, res) => {
  await ensureTable();
  try {
    const r = await pool.query('SELECT * FROM vendors WHERE user_id = $1 OR user_id IS NULL ORDER BY name', [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

router.post('/', async (req, res) => {
  await ensureTable();
  try {
    const { name, contact_name, email, phone, services, default_rate, rate_unit, currency, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const r = await pool.query(
      `INSERT INTO vendors (user_id, name, contact_name, email, phone, services, default_rate, rate_unit, currency, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, name, contact_name || null, email || null, phone || null, services || null, default_rate || null, rate_unit || 'hour', currency || 'USD', notes || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
  await ensureTable();
  try {
    const r = await pool.query('SELECT * FROM vendors WHERE id = $1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  await ensureTable();
  try {
    const { name, contact_name, email, phone, services, default_rate, rate_unit, currency, notes, is_active } = req.body;
    const r = await pool.query(
      `UPDATE vendors SET
         name = COALESCE($2, name),
         contact_name = COALESCE($3, contact_name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         services = COALESCE($6, services),
         default_rate = COALESCE($7, default_rate),
         rate_unit = COALESCE($8, rate_unit),
         currency = COALESCE($9, currency),
         notes = COALESCE($10, notes),
         is_active = COALESCE($11, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.id, name, contact_name, email, phone, services, default_rate, rate_unit, currency, notes, is_active]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  await ensureTable();
  try {
    const r = await pool.query('DELETE FROM vendors WHERE id = $1 RETURNING id', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
