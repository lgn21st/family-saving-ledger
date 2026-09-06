# Supabase operations

## Preflight

```bash
supabase status
supabase projects list
docker context show
npm run db:start
npm run db:migrate
git status --short --branch
```

Confirm `.env.local` points to the remote MagicDNS host on port `54321` without printing key values.
The Mac and remote development host must share a Tailscale network with MagicDNS enabled.

## Incremental remote development migration

```bash
npm run db:migrate
npm run test:db
npm run db:lint
```

## Destructive local rebuild

Obtain explicit confirmation before resetting the remote development database. A reset removes its data, applies
all migrations, then loads `supabase/seed.sql`. Do not use `--local` without an SSH tunnel because
the Supabase CLI resolves it to `127.0.0.1`; use the remote DB URL runtime helper.

## Remote push

```bash
supabase db push --linked --dry-run
supabase db push --linked
```

Direct project endpoints normally require IPv6. For IPv4-only networks, copy the Session Pooler URL from Dashboard -> Connect and use port `5432`:

```bash
supabase db push --db-url '<SESSION_POOLER_URL>' --dry-run
supabase db push --db-url '<SESSION_POOLER_URL>'
```

Do not store the URL when it contains a password.

## Data refresh guardrails

1. Verify linked project status and migration compatibility.
2. Export a local data-only backup.
3. Export remote data-only dump.
4. Inspect dump table names without printing row data.
5. Truncate only intended local tables.
6. Restore with `ON_ERROR_STOP` and a single transaction.
7. Compare remote/local row counts and run ledger invariant queries.
8. Delete remote dumps; retain the local backup only until verification is accepted.

## Verification

```bash
npm run test:db
npm run db:lint
npm run check
```

Database tests must report that their transaction rolled back.
