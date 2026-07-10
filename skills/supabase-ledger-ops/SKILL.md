---
name: supabase-ledger-ops
description: Operate and troubleshoot Supabase for Family Saving Ledger. Use for local startup, incremental migrations, destructive reset, seed, database tests, lint, linked-project push, IPv4 pooler fallback, dump and restore, remote-to-local data refresh, or migration history diagnosis.
---

# Supabase Ledger Operations

1. Read `references/operations.md` for the requested workflow.
2. Confirm the working directory, linked project and local service status before database operations.
3. Prefer `migration up --local` for incremental local changes; treat `db reset --local` as destructive.
4. Run remote pushes with `--dry-run` first. Use the Session Pooler on IPv4-only networks.
5. Before replacing local data, create a local backup and validate the remote dump table scope.
6. Never print, commit or persist database passwords, temporary login credentials, anon/service keys or data dumps.
7. Validate row counts and ledger invariants after restore or migration.
8. Run database tests and lint after any operation that changes schema or data semantics.
