-- Record the API privileges that previously existed only in production.
-- The product intentionally uses the anon/authenticated roles with permissive RLS
-- inside a small trusted-family PIN model; authoritative ledger mutations remain RPCs.

grant usage on schema public to anon, authenticated, service_role;

grant all privileges on table
  public.app_users,
  public.accounts,
  public.transactions,
  public.interest_log,
  public.settings,
  public.account_balances
to anon, authenticated, service_role;

grant execute on function public.apply_transaction(uuid, text, numeric, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.transfer_between_accounts(uuid, uuid, numeric, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.void_transaction(uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.close_account(uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.archive_child(uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.get_account_balance(uuid)
  to anon, authenticated, service_role;
grant execute on function public.get_balance_before_date(uuid, timestamptz)
  to anon, authenticated, service_role;
grant execute on function public.is_active_parent(uuid)
  to anon, authenticated, service_role;
grant execute on function public.run_monthly_interest()
  to anon, authenticated, service_role;

revoke execute on function public.run_monthly_interest_impl()
  from public, anon, authenticated;
grant execute on function public.run_monthly_interest_impl()
  to service_role;

alter default privileges for role postgres in schema public
  grant all privileges on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all privileges on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all privileges on functions to anon, authenticated, service_role;
