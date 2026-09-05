# AGENTS.md — Family Saving Ledger

## Product boundary

Family Saving Ledger is a zh-CN Vue 3 PWA for a small trusted family: parents manage savings accounts and children view their own balances and history. Supabase provides persistence, RPC business rules and monthly interest settlement.

This is not a public multi-tenant authentication system. PIN login and the current RLS/grant model are accepted product constraints; do not silently broaden the security model or claim it is suitable for untrusted users.

## Read before changing code

Always inspect the current files and Git status. Do not rely on line counts, test counts or architecture remembered from an earlier task.

Use the project skills when applicable:

- `.agents/skills/vue-ledger-ui` for Vue components, application assembly and frontend tests.
- `.agents/skills/family-ledger-domain` for ledger rules, RPCs, balances, transfers, closing, archival and interest.
- `.agents/skills/supabase-ledger-ops` for local/remote migrations, reset, seed, dump/restore and database troubleshooting.

Read only the references required by the selected skill, but read each selected `SKILL.md` completely.

## Architecture

```text
src/
├── App.vue              # thin view entry
├── app/                 # page assembly and cross-feature coordination
├── components/          # prop-driven presentation and interaction
├── composables/         # independently meaningful/testable capabilities
├── config/              # static product configuration
├── types/               # domain and Supabase boundary types
└── test/                # test runtime setup
supabase/
├── migrations/          # database schema source of truth
├── tests/               # rollback-only database integration tests
└── seed.sql             # disposable local development data
```

See `docs/architecture.md`, `docs/development.md` and `docs/database.md` for details.

Dependency direction:

```text
components → app assembly → composables → Supabase client
                         ↘ domain/config types
```

Components must not query Supabase directly. Authoritative balance, role and concurrency checks belong in database RPCs, not only in the UI.

## Code conventions

- Vue 3 `script setup` with TypeScript.
- `PascalCase.vue` components and `useFeature.ts` composables.
- Typed props and explicit callback props; named `v-model` for editable fields.
- Add a composable only for a real capability or independently testable behavior, not a one-line forwarding wrapper.
- Keep domain models in `src/types/domain.ts`; keep Supabase adapter contracts in `src/types/supabase.ts`.
- Keep user-facing text in Chinese.
- Preserve mobile/PWA behavior and accessible role/name queries in tests.

## Ledger invariants

- Only active parents mutate ledger data; children are read-only.
- Amounts are positive; withdrawals and outgoing transfers cannot create negative balances.
- Transfers require different active accounts with the same currency. Both rows share a group ID and are voided together.
- Voided rows do not affect balances or interest.
- Accounts and children close/archive only at an authoritative zero balance; history is retained.
- Interest is monthly and idempotent per account/month.
- Lock related rows in deterministic UUID order for concurrent multi-row operations.

Any change to these rules requires a migration, relevant frontend changes, database integration coverage and documentation updates.

## Database workflow

`supabase/migrations/` is the only schema source. Do not recreate a parallel `schema.sql` snapshot.

```bash
supabase migration up --local   # incremental, preserves local data
supabase db reset --local       # destructive rebuild + seed
```

Confirm before destructive reset or replacing local data. For remote pushes, run `--dry-run` first. On IPv4-only networks use the Supabase Session Pooler URL as described in `docs/database.md`.

## Verification

For frontend-only changes:

```bash
npm run check
```

For database, RPC, ledger semantics or full-project changes:

```bash
npm run check
npm run test:db
supabase db lint --local --level warning
git diff --check
```

Tests use Vitest and Testing Library under `src/__tests__/`. Mock the Supabase boundary consistently. Database tests must run in a transaction and roll back.

## Git

Preserve unrelated user changes. Use explicit staging and `type: description` commits (`feat`, `fix`, `refactor`, `test`, `docs`, `chore`). Split commits by logical concern when practical.
