---
name: family-ledger-domain
description: "Preserve business semantics in the family-saving-ledger project. Use for its roles, accounts, transactions, balances, transfers, interest, database RPCs, migrations, and related tests; not for unrelated ledger or database projects."
---

# Family Ledger Domain

1. Read `references/ledger-model.md` before changing ledger behavior or database objects.
2. Inspect the relevant migrations, latest RPC definitions and `supabase/tests/business_risks.sql`.
3. Keep database RPCs authoritative for role checks, balances and multi-row consistency.
4. Preserve history: close/archive/void instead of physically deleting ledger records.
5. Lock related rows in deterministic UUID order and keep interest idempotent per account/month.
6. Add a new forward-only migration; do not edit migration history already deployed.
7. Update database integration tests, frontend contracts and `docs/database.md` when semantics change.
8. Run `npm run check`, `npm run test:db` and `supabase db lint --local --level warning`.
