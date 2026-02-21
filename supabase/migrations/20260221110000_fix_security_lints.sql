alter view public.account_balances set (security_invoker = true);

alter table public.app_users enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.interest_log enable row level security;
alter table public.settings enable row level security;

drop policy if exists allow_all_app_users on public.app_users;
create policy allow_all_app_users
on public.app_users
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists allow_all_accounts on public.accounts;
create policy allow_all_accounts
on public.accounts
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists allow_all_transactions on public.transactions;
create policy allow_all_transactions
on public.transactions
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists allow_all_interest_log on public.interest_log;
create policy allow_all_interest_log
on public.interest_log
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists allow_all_settings on public.settings;
create policy allow_all_settings
on public.settings
for all
to anon, authenticated
using (true)
with check (true);
