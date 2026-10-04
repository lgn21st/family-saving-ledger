# Ledger model and invariants

## Tables

- `app_users`: parent/child role, PIN, avatar, active/archive audit fields.
- `accounts`: child owner, creator, currency, active/close audit fields.
- `transactions`: positive amount, currency, type, transfer links, interest month, request receipt and void audit fields.
- `settings`: annual interest rate and timezone.
- `interest_log`: per-account monthly interest audit.

## Roles and lifecycle

- Only an active parent may create or mutate ledger data.
- Children are read-only.
- Archived users cannot log in or restore a session.
- Account closure and child archival require locked authoritative zero balances.
- Closing or archiving hides active entities but retains transactions and audit history.

## Transactions and balances

- Types: `deposit`, `withdrawal`, `transfer_in`, `transfer_out`, `interest`.
- Amounts are positive; withdrawal and transfer-out contribute negative balance.
- Voided transactions are excluded from balances and interest.
- Withdrawal, transfer and void RPCs reject insufficient or negative resulting balances inside the database transaction.
- Voiding locks affected accounts in UUID order and refuses inactive accounts.
- Deposit/withdrawal and transfer RPCs accept an optional request UUID scoped to the active parent. The same ID and original inputs return the original transaction(s), including after voiding or closing; different inputs are rejected.
- A transfer stores its receipt on the outgoing row. Failed writes leave no receipt; legacy callers may omit the ID.

## Transfers

- Source and target differ, remain active and use the same currency.
- The pair shares `transfer_group_id`, amount and currency.
- Voiding either side locks both rows in UUID order and voids both.

## Interest

- Use `settings.annual_rate` and `settings.timezone`.
- Compute monthly interest from daily balances.
- Stamp catch-up interest at the next month start in `settings.timezone` so later months compound.
- Enforce one non-void interest transaction and one log per account/month.
- Serialize settlement per account/month and process accounts in deterministic order.

## RPC surface

- `apply_transaction`
- `transfer_between_accounts`
- `void_transaction`
- `close_account`
- `archive_child`
- `create_child`
- `update_child_name`
- `create_account`
- `update_account_name`
- `run_monthly_interest`
- `get_account_balance`
- `get_balance_before_date`

Treat migration files as the source of truth for exact signatures.
