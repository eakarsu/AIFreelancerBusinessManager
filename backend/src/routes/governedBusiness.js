import { Router } from 'express';
import crypto from 'crypto';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { calculateInvoice, validateTransition } from '../domain/businessWorkflow.js';

const router = Router();
router.use(authenticateToken);
const tenant = (req) => String(req.user.organization_id || req.user.tenant_id || `personal-${req.user.id}`);
const requestId = (req) => req.get('x-request-id') || crypto.randomUUID();

router.get('/engagements', async (req, res, next) => {
  try { const result = await pool.query('SELECT * FROM business_engagements WHERE tenant_id=$1 ORDER BY created_at DESC', [tenant(req)]); res.json(result.rows); } catch (error) { next(error); }
});

router.post('/engagements', async (req, res, next) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ error: 'title is required' });
    const result = await pool.query('INSERT INTO business_engagements(tenant_id,client_id,title,created_by) VALUES($1,$2,$3,$4) RETURNING *', [tenant(req), req.body.client_id || null, req.body.title.trim(), req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});

router.post('/engagements/:id/time', async (req, res) => {
  const client = await pool.connect();
  try {
    const key = req.get('idempotency-key'); if (!key) throw new Error('Idempotency-Key header is required');
    const start = new Date(req.body.started_at), end = new Date(req.body.ended_at);
    if (!req.body.description || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) throw new Error('valid start, end, and description required');
    await client.query('BEGIN');
    const found = await client.query('SELECT id FROM business_engagements WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
    if (!found.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'engagement not found' }); }
    const result = await client.query(
      `INSERT INTO business_time_ledger(tenant_id,engagement_id,user_id,started_at,ended_at,rate,currency,description,idempotency_key)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(tenant_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *`,
      [tenant(req), req.params.id, req.user.id, start, end, Number(req.body.rate || 0), String(req.body.currency || 'USD').toUpperCase(), req.body.description, key]
    );
    await client.query('INSERT INTO business_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,after_state,request_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [tenant(req), req.user.id, 'time.recorded', 'engagement', String(req.params.id), result.rows[0], requestId(req)]);
    await client.query('COMMIT'); res.status(201).json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(400).json({ error: error.message }); } finally { client.release(); }
});

router.post('/engagements/:id/transition', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT * FROM business_engagements WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [req.params.id, tenant(req)]);
    const before = found.rows[0]; if (!before) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'engagement not found' }); }
    let invoice = before.invoice_snapshot;
    if (req.body.stage === 'invoiced') invoice = calculateInvoice(req.body.invoice_lines, req.body.tax_rate || 0);
    validateTransition(before.stage, req.body.stage, { role: req.user.role, contractVersion: req.body.contract_version || before.contract_version, approvedAt: req.body.contract_approved_at || before.contract_approved_at, reconciliationReference: req.body.payment_reconciliation_reference || before.payment_reconciliation_reference });
    const result = await client.query(
      `UPDATE business_engagements SET stage=$1,contract_version=COALESCE($2,contract_version),contract_approved_at=COALESCE($3,contract_approved_at),deliverable_acceptance=COALESCE($4,deliverable_acceptance),invoice_snapshot=$5,payment_reconciliation_reference=COALESCE($6,payment_reconciliation_reference),version=version+1,updated_at=NOW()
       WHERE id=$7 AND tenant_id=$8 AND version=$9 RETURNING *`,
      [req.body.stage, req.body.contract_version, req.body.contract_approved_at, req.body.deliverable_acceptance ? JSON.stringify(req.body.deliverable_acceptance) : null, invoice ? JSON.stringify(invoice) : null, req.body.payment_reconciliation_reference, before.id, tenant(req), Number(req.body.version)]
    );
    if (!result.rows[0]) throw new Error('version conflict');
    await client.query('INSERT INTO business_audit_events(tenant_id,actor_user_id,action,entity_type,entity_id,before_state,after_state,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [tenant(req), req.user.id, 'engagement.transitioned', 'engagement', String(before.id), before, result.rows[0], requestId(req)]);
    await client.query('COMMIT'); res.json(result.rows[0]);
  } catch (error) { await client.query('ROLLBACK'); res.status(409).json({ error: error.message }); } finally { client.release(); }
});

router.post('/integration-runs', async (req, res, next) => {
  try {
    if (!req.body.provider || !req.body.operation || !['queued','succeeded','failed','manual_review'].includes(req.body.status)) return res.status(400).json({ error: 'provider, operation, and valid status required' });
    if (req.body.status === 'failed' && !req.body.error_code) return res.status(400).json({ error: 'error_code required for failure' });
    const result = await pool.query('INSERT INTO business_integration_runs(tenant_id,provider,operation,external_reference,status,error_code,error_message,retry_after) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *', [tenant(req), req.body.provider, req.body.operation, req.body.external_reference || null, req.body.status, req.body.error_code || null, req.body.error_message || null, req.body.retry_after || null]);
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
});
export default router;
