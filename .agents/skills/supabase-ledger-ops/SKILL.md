---
name: supabase-ledger-ops
description: Operate and troubleshoot Supabase for Family Saving Ledger. Use for local startup, incremental migrations, destructive reset, seed, database tests, lint, linked-project push, IPv4 pooler fallback, dump and restore, remote-to-local data refresh, or migration history diagnosis.
---

# Supabase Ledger Operations

1. Read `references/operations.md`, then the repo doc it names for the workflow (`docs/development.md` or `docs/database.md`).
2. Confirm the working directory, linked project, `.env.local` MagicDNS URL, Docker context `remote` (for `supabase start` / image cleanup) and service status before database operations.
3. Prefer `npm run db:migrate` for incremental development-database changes; treat any database reset as destructive.
4. Run production pushes with `--dry-run` first. Use the Session Pooler on IPv4-only networks.
5. Before replacing development data, create a backup and validate dump table scope.
6. Never print, commit or persist database passwords, temporary login credentials, anon/service keys or data dumps.
7. Validate row counts and ledger invariants after restore or migration.
8. Run database tests and lint after any operation that changes schema or data semantics.
