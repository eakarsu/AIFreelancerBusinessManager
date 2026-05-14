// Apply pass 5: Marketing / lead pipeline backlog.
//
// Category: NEEDS-PRODUCT-DECISION.
// PRODUCT-DECISION: Picked a flat `leads` + `lead_activities` model with a
// fixed CRM-style stage enum (new → contacted → qualified → proposal → won/lost).
// Rejected richer alternatives (campaigns, attribution, source weights,
// per-stage SLAs) — they require user research. This default is the most
// common shape across freelancer CRMs (HubSpot Lite, Streak) and is forward-
// compatible with adding a `campaigns` table later.
//
// Endpoints (auth):
//   GET    /api/marketing/leads
//   POST   /api/marketing/leads
//   GET    /api/marketing/leads/:id
//   PUT    /api/marketing/leads/:id        — supports `stage` updates
//   DELETE /api/marketing/leads/:id
//   POST   /api/marketing/leads/:id/activities  — log a contact / note
//   GET    /api/marketing/leads/:id/activities
//   GET    /api/marketing/_/funnel         — counts by stage

import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

let tableReady = false;
async function ensureTables() {
  if (tableReady) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        email TEXT,
        phone VARCHAR(50),
        source VARCHAR(80),
        stage VARCHAR(40) DEFAULT 'new',
        estimated_value NUMERIC(12,2),
        currency VARCHAR(10) DEFAULT 'USD',
        notes TEXT,
        next_action_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lead_activities (
        id SERIAL PRIMARY KEY,
        lead_id INT NOT NULL,
        user_id INT,
        activity_type VARCHAR(40) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tableReady = true;
  } catch (e) { /* schema-tolerant */ }
}

router.use(authenticateToken);

router.get('/_/funnel', async (req, res) => {
  await ensureTables();
  try {
    const r = await pool.query(
      "SELECT stage, COUNT(*)::int AS count, COALESCE(SUM(estimated_value),0)::numeric AS total_value FROM leads WHERE user_id = $1 GROUP BY stage",
      [req.user.id]
    );
    const map = Object.fromEntries(STAGES.map(s => [s, { count: 0, total_value: 0 }]));
    for (const row of r.rows) map[row.stage] = { count: row.count, total_value: Number(row.total_value) };
    res.json({ stages: STAGES, funnel: map });
  } catch (e) { res.json({ stages: STAGES, funnel: {} }); }
});

router.get('/leads', async (req, res) => {
  await ensureTables();
  try {
    const stage = req.query.stage;
    const sql = stage
      ? 'SELECT * FROM leads WHERE user_id = $1 AND stage = $2 ORDER BY updated_at DESC'
      : 'SELECT * FROM leads WHERE user_id = $1 ORDER BY updated_at DESC';
    const params = stage ? [req.user.id, stage] : [req.user.id];
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

router.post('/leads', async (req, res) => {
  await ensureTables();
  try {
    const { name, company, email, phone, source, stage, estimated_value, currency, notes, next_action_at } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    if (stage && !STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(',')}` });
    const r = await pool.query(
      `INSERT INTO leads (user_id, name, company, email, phone, source, stage, estimated_value, currency, notes, next_action_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id, name, company || null, email || null, phone || null, source || null, stage || 'new', estimated_value || null, currency || 'USD', notes || null, next_action_at || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leads/:id', async (req, res) => {
  await ensureTables();
  try {
    const r = await pool.query('SELECT * FROM leads WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/leads/:id', async (req, res) => {
  await ensureTables();
  try {
    const { name, company, email, phone, source, stage, estimated_value, currency, notes, next_action_at } = req.body;
    if (stage && !STAGES.includes(stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(',')}` });
    const r = await pool.query(
      `UPDATE leads SET
         name = COALESCE($3, name),
         company = COALESCE($4, company),
         email = COALESCE($5, email),
         phone = COALESCE($6, phone),
         source = COALESCE($7, source),
         stage = COALESCE($8, stage),
         estimated_value = COALESCE($9, estimated_value),
         currency = COALESCE($10, currency),
         notes = COALESCE($11, notes),
         next_action_at = COALESCE($12, next_action_at),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id, name, company, email, phone, source, stage, estimated_value, currency, notes, next_action_at]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/leads/:id', async (req, res) => {
  await ensureTables();
  try {
    const r = await pool.query('DELETE FROM leads WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'not found' });
    res.json({ deleted: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/leads/:id/activities', async (req, res) => {
  await ensureTables();
  try {
    const { activity_type, notes } = req.body;
    if (!activity_type) return res.status(400).json({ error: 'activity_type required' });
    const r = await pool.query(
      'INSERT INTO lead_activities (lead_id, user_id, activity_type, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, req.user.id, activity_type, notes || null]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/leads/:id/activities', async (req, res) => {
  await ensureTables();
  try {
    const r = await pool.query('SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

export default router;
