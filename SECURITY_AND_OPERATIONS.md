# Security and operations

Run `scripts/bootstrap.sh`, export `DATABASE_URL`, run `scripts/migrate.sh`, then use `./start.sh`. Startup is non-destructive and only stops child processes it created. Demo seeding is guarded and must use a disposable database. Demo credentials are disabled unless explicitly enabled outside production.

`/api/business-workflow` provides a tenant-scoped lead-to-payment engagement ledger. Contract activation requires a version and approval timestamp; time entries are ordered, idempotent, and durable; invoice totals are calculated deterministically; financial transitions require an owner/admin/finance role and payment reconciliation; optimistic versions prevent lost updates; integration failures are first-class records; transitions and time changes are audited.

Email/calendar, CRM/project, e-signature, payment/accounting, storage, and tax systems still require real accounts, signed contracts, provider webhooks, data-processing terms, and reconciliation tests. No payment, refund, tax filing, legal contract judgment, or provider delivery is represented as validated by this repository.
