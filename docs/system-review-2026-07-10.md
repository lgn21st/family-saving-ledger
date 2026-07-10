# System Review — 2026-07-10

> Historical review snapshot. Current structure and commands live in
> `docs/architecture.md`, `docs/development.md`, and `docs/database.md`;
> validation counts below reflect the original review run.

## Scope and outcome

The review covered the Vue application, composables, tests, PWA build, Supabase
schema and migrations, ledger invariants, local runtime configuration,
dependency health, and the Node/Supabase/Docker toolchain.

The dependency and toolchain upgrade is complete. The project now targets Node
24 LTS, builds with Vite 8 and Tailwind CSS 4, passes all quality gates, and has
zero known npm audit vulnerabilities. No local database reset was performed.

## Upgrade summary

| Area | Before | After |
| --- | --- | --- |
| Node.js | Undeclared; local Node 26 | 24.18.0, pinned by `mise.toml` and `.nvmrc` |
| npm | Undeclared | 11.16.0 |
| Vue | 3.5.26 | 3.5.39 |
| Supabase JS | 2.90.1 | 2.110.2 |
| Vite | 7.3.1 | 8.1.4 |
| Vitest | 4.0.17 | 4.1.10 |
| TypeScript | 5.9.3 | 6.0.3 |
| vue-tsc | 2.2.12 | 3.3.7 |
| ESLint | 9.39.2 | 10.6.0 |
| Tailwind CSS | 3.4.19 | 4.3.2 with the Vite plugin |
| npm audit | 21 vulnerabilities | 0 vulnerabilities |

TypeScript 6 is the deliberate transition target before TypeScript 7. It is
supported by the installed Vue and ESLint toolchain while keeping the native
TypeScript 7 migration separate and reviewable.

## Findings and disposition

### Resolved: monthly interest was globally gated

`run_monthly_interest()` now calculates missing `(account_id, month)` pairs,
uses the existing per-account unique constraints as its idempotency boundary,
repairs missing audit rows, and serializes concurrent settlement calls with a
transaction-scoped advisory lock. The public settlement wrapper also locks all
active accounts in deterministic order, preventing settlement from racing an
account close, archive, transfer, or transaction write. A rollback-only
database test covers a month
where one account was already settled and another was not, followed by an
idempotent rerun.

### Resolved: child deletion was non-atomic and destructive

Physical deletion has been replaced with the `archive_child()` RPC. It locks
the child and all active child accounts, rejects archival unless every balance
is exactly zero, then archives the child and accounts in one database
transaction. Transactions and transfer pairs remain intact. The UI now labels
the operation as archival and requires explicit confirmation.

### Resolved: transfers acquired locks in caller-dependent order

`transfer_between_accounts()` now locks both account rows in deterministic UUID
order before loading source and target records. This follows PostgreSQL's
recommended defense against row-lock deadlocks. Transfer-group voiding likewise
locks both transaction rows by UUID before updating either side.

### Resolved: account closure trusted a cached browser balance

Account closure now uses `close_account()`. The RPC locks the account row,
computes the authoritative ledger balance, rejects nonzero balances, and writes
`closed_at`/`closed_by` audit fields atomically. The browser no longer performs
the state-changing table update directly.

### Resolved: important foreign-key and mutation paths lacked indexes

Indexes now cover account ownership/creator fields, related accounts, transfer
groups, transaction creators/voiders, and archive/close audit references.
Supabase's local performance advisor reports no warnings.

### Strengthened within the current trust model: RPC role boundaries

All ledger mutation RPCs now require an active parent user ID, and archived
users are rejected by login/session restoration. RLS remains intentionally
allow-all for the project's trusted-family, PIN-only model. If the app becomes
internet-exposed or multi-family, it still needs Supabase Auth identities and
restrictive RLS; that would be a separate product/security change.

### Remaining low-priority scale consideration: offset pagination

Transaction history still uses range/offset pagination. This is acceptable for
the current three-user family scale. Move to a `(created_at, id)` cursor if
history volume grows enough for deep pagination to become measurable.

### Explicit product policy: current-month interest on closure/archive

Closing an account or archiving a child requires authoritative zero balances,
but does not create a partial current-month interest settlement. The confirmation
dialog now states explicitly that unposted current-month interest is forfeited.
Changing this policy would require a separate prorated-interest specification.

## Changes made during review

- Fixed the existing explicit-`any` lint failure in `useTransactions`.
- Made Supabase client initialization safe when environment variables are
  absent, with a regression test.
- Migrated Tailwind 3 PostCSS configuration to the Tailwind 4 Vite plugin.
- Migrated deprecated Supabase `[inbucket]` configuration to `[local_smtp]`.
- Added reproducible Node/npm declarations and a single `npm run check` gate.
- Updated local-development documentation, including the destructive reset
  warning.
- Added atomic close/archive RPCs, deterministic transfer locking, active-parent
  validation, audit columns, and supporting indexes.
- Added rollback-only database integration tests for the repaired ledger
  invariants.

## Validation

- `mise exec -- npm run check`: pass
- Vitest: 39 files, 98 tests pass
- Vite/PWA production build: pass
- `npm audit`: 0 vulnerabilities
- `supabase db lint --local --level warning`: no schema errors
- `npm run test:db`: pass; all writes rolled back
- Supabase performance advisor: no issues
- Supabase local API and database: running
- Desktop and mobile browser checks: no horizontal overflow; no console errors

The PWA build emits one upstream deprecation warning from `vite-plugin-pwa`
about `inlineDynamicImports` under Vite 8. The build output is valid; this should
be removed when the plugin publishes the corresponding Rolldown migration.
