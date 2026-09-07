# Supabase operations

Procedures live in the repo docs. Do not copy commands here.

- Environment, Tailscale, Docker context: `docs/development.md`
- Schema, migrate, production push, prod→dev sync, scripts: `docs/database.md`

Safety:

- Confirm the working directory, linked project, `.env.local` MagicDNS URL, Docker context `remote` (for `supabase start` / image cleanup) and service status before database work.
- Never print, commit or persist database passwords, login credentials, anon/service keys or data dumps.
- Confirm before `db reset` or replacing development data.
- Production pushes: `--dry-run` first; IPv4-only networks use the Session Pooler URL and do not store it.
- After restore or migration: compare intended row counts and run ledger invariant checks.
- After schema or data-semantics changes: `npm run test:db` and `npm run db:lint`. Database tests must roll back.
