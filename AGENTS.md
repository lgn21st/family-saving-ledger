# AGENTS.md — Family Saving Ledger

## Product boundary

Family Saving Ledger is a zh-CN Vue 3 PWA for a small trusted family: parents manage savings accounts and children view their own balances and history. Supabase provides persistence, RPC business rules and monthly interest settlement.

This is not a public multi-tenant authentication system. PIN login and the current RLS/grant model are accepted product constraints; do not silently broaden the security model or claim it is suitable for untrusted users.

## Read before changing code

Always inspect the current files and Git status. Do not rely on line counts, test counts or architecture remembered from an earlier task.

Read the relevant project docs:

- `docs/architecture.md` before changing frontend structure or data flow.
- `docs/ledger-model.md` before changing ledger behavior or database objects; inspect the relevant migrations, latest RPC definitions and database tests.
- `docs/database.md` for database operations; `docs/development.md` for environment setup and troubleshooting.

## Architecture

See `docs/architecture.md`. Keep `App.vue` as a thin view and cross-feature coordination in `src/app/`. Components must not query Supabase. Authoritative balance, role and concurrency checks belong in database RPCs.

## Code conventions

- Keep code, docs and structure compact. Add files, layers or abstractions only for a concrete need; merge single-use forwarding wrappers.
- Vue 3 `script setup` with TypeScript.
- `PascalCase.vue` components and `useFeature.ts` composables.
- Typed props and explicit callback props; named `v-model` for editable fields.
- Add a composable only for a real capability or independently testable behavior, not a one-line forwarding wrapper.
- Keep domain models in `src/types/domain.ts`; keep Supabase adapter contracts in `src/types/supabase.ts`.
- Keep user-facing text in Chinese.
- Preserve mobile/PWA behavior and accessible role/name queries in tests.

## Ledger invariants

Canonical list: `docs/ledger-model.md`.
Changing those rules requires a migration, frontend updates, database tests and an edit to that file.

## Database workflow

`supabase/migrations/` is the only schema source. Do not recreate a parallel `schema.sql` snapshot.
Commands, production push, and prod→dev sync live in `docs/database.md`. Confirm before destructive reset or replacing development data.

## Verification

For frontend-only changes:

```bash
npm run check
```

For database, RPC, ledger semantics or full-project changes:

```bash
npm run check
npm run test:db
npm run db:lint
git diff --check
```

Tests use Vitest and Testing Library under `src/__tests__/`. Mock the Supabase boundary consistently. Database tests must run in a transaction and roll back.

## Git

Preserve unrelated user changes. Use explicit staging and `type: description` commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`). Split commits by logical concern when practical.
