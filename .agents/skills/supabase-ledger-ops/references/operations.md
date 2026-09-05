# Supabase operations

## Preflight

```bash
supabase status
supabase projects list
supabase migration list --local
git status --short --branch
```

Confirm `.env.local` points to the intended local or remote API without printing key values.

## Incremental local migration

```bash
supabase migration up --local
npm run test:db
supabase db lint --local --level warning
```

## Destructive local rebuild

Obtain explicit confirmation because this removes local data:

```bash
supabase db reset --local
```

Reset applies all files in `supabase/migrations/`, then `supabase/seed.sql`.

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
supabase db lint --local --level warning
npm run check
```

Database tests must report that their transaction rolled back.
