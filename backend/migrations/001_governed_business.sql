CREATE TABLE IF NOT EXISTS business_engagements (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, client_id BIGINT, title TEXT NOT NULL, stage TEXT NOT NULL DEFAULT 'lead',
  contract_version TEXT, contract_approved_at TIMESTAMPTZ, deliverable_acceptance JSONB NOT NULL DEFAULT '[]'::jsonb,
  invoice_snapshot JSONB, payment_reconciliation_reference TEXT, created_by BIGINT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_stage CHECK (stage IN ('lead','proposal','contract','active','delivered','invoiced','paid','closed'))
);
CREATE TABLE IF NOT EXISTS business_time_ledger (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, engagement_id BIGINT NOT NULL REFERENCES business_engagements(id), user_id BIGINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL, ended_at TIMESTAMPTZ NOT NULL, rate NUMERIC(12,2) NOT NULL, currency CHAR(3) NOT NULL,
  description TEXT NOT NULL, idempotency_key TEXT NOT NULL, locked_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT time_order CHECK (ended_at > started_at), CONSTRAINT rate_nonnegative CHECK (rate >= 0), UNIQUE(tenant_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS business_integration_runs (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, operation TEXT NOT NULL, external_reference TEXT,
  status TEXT NOT NULL, error_code TEXT, error_message TEXT, retry_after TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT business_integration_status CHECK (status IN ('queued','succeeded','failed','manual_review'))
);
CREATE TABLE IF NOT EXISTS business_audit_events (
  id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, actor_user_id BIGINT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  before_state JSONB, after_state JSONB, request_id TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS engagement_tenant_stage_idx ON business_engagements(tenant_id, stage);
