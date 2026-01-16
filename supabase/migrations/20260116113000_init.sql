create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('parent', 'child')),
  pin text not null,
  avatar_id text,
  created_at timestamp with time zone default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null,
  owner_child_id uuid not null references app_users(id),
  created_by uuid not null references app_users(id),
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'interest')),
  amount numeric(12, 2) not null,
  currency text not null,
  note text,
  related_account_id uuid references accounts(id),
  created_by uuid not null references app_users(id),
  created_at timestamp with time zone default now()
);

create table if not exists interest_config (
  id uuid primary key default gen_random_uuid(),
  annual_rate numeric(5, 2) not null,
  next_annual_rate numeric(5, 2),
  effective_month date,
  updated_at timestamp with time zone default now()
);

create table if not exists interest_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  month date not null,
  annual_rate numeric(5, 2) not null,
  interest_amount numeric(12, 2) not null,
  created_at timestamp with time zone default now(),
  unique (account_id, month)
);

create or replace function run_monthly_interest(run_month date default date_trunc('month', now())::date)
returns void
language plpgsql
as $$
declare
  target_month_start date := date_trunc('month', run_month - interval '1 month')::date;
  target_month_end date := (date_trunc('month', run_month) - interval '1 day')::date;
  current_rate numeric(5, 2);
  next_rate numeric(5, 2);
  effective_month date;
  applied_rate numeric(5, 2);
begin
  select annual_rate, next_annual_rate, effective_month
  into current_rate, next_rate, effective_month
  from interest_config
  limit 1;

  if effective_month is not null
    and effective_month <= date_trunc('month', run_month)::date
    and next_rate is not null then
    applied_rate := next_rate;
  else
    applied_rate := current_rate;
  end if;

  if applied_rate is null then
    applied_rate := 10.00;
  end if;

  with days as (
    select generate_series(target_month_start, target_month_end, interval '1 day')::date as day
  ),
  account_days as (
    select
      accounts.id as account_id,
      accounts.currency,
      days.day,
      coalesce(
        (
          select sum(
            case
              when transactions.type in ('withdrawal', 'transfer_out') then -transactions.amount
              else transactions.amount
            end
          )
          from transactions
          where transactions.account_id = accounts.id
            and transactions.created_at < (days.day + interval '1 day')
        ),
        0
      ) as balance
    from accounts
    cross join days
    where accounts.is_active = true
  ),
  monthly_interest as (
    select
      account_id,
      currency,
      round(sum(balance * applied_rate / 100 / 365)::numeric, 2) as interest_amount
    from account_days
    group by account_id, currency
  ),
  inserted_logs as (
    insert into interest_log (account_id, month, annual_rate, interest_amount)
    select account_id, target_month_start, applied_rate, interest_amount
    from monthly_interest
    where interest_amount > 0
    on conflict (account_id, month) do nothing
    returning account_id, interest_amount
  )
  insert into transactions (account_id, type, amount, currency, note, related_account_id, created_by)
  select
    inserted_logs.account_id,
    'interest',
    inserted_logs.interest_amount,
    accounts.currency,
    '月结息 ' || applied_rate || '%',
    null,
    accounts.created_by
  from inserted_logs
  join accounts on accounts.id = inserted_logs.account_id;

  if effective_month is not null
    and effective_month <= date_trunc('month', run_month)::date
    and next_rate is not null then
    update interest_config
    set annual_rate = next_rate,
        next_annual_rate = null,
        effective_month = null,
        updated_at = now();
  end if;
end;
$$;

insert into interest_config (id, annual_rate)
values ('00000000-0000-0000-0000-000000000001', 10.00)
on conflict (id) do nothing;
