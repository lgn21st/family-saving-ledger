create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('parent', 'child')),
  pin text not null check (pin ~ '^[0-9]{4}$'),
  avatar_id text,
  created_at timestamp with time zone default now()
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  owner_child_id uuid not null references app_users(id),
  created_by uuid not null references app_users(id),
  is_active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'interest')),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null,
  note text,
  related_account_id uuid references accounts(id),
  created_by uuid not null references app_users(id),
  created_at timestamp with time zone default now(),
  interest_month date
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  annual_rate numeric(5, 2) not null,
  timezone text not null default 'Asia/Singapore',
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

create unique index if not exists transactions_interest_unique_idx
  on transactions (account_id, interest_month)
  where type = 'interest' and interest_month is not null;

create index if not exists transactions_account_created_at_idx
  on transactions (account_id, created_at desc);

create or replace view account_balances as
select
  account_id,
  coalesce(
    sum(
      case
        when type in ('withdrawal', 'transfer_out') then -amount
        else amount
      end
    ),
    0
  )::numeric(12, 2) as balance
from transactions
group by account_id;

create or replace function get_account_balance(p_account_id uuid)
returns numeric
language sql
stable
as $$
  select coalesce(
    sum(
      case
        when type in ('withdrawal', 'transfer_out') then -amount
        else amount
      end
    ),
    0
  )
  from transactions
  where account_id = p_account_id;
$$;

create or replace function get_balance_before_date(
  p_account_id uuid,
  p_before timestamptz
)
returns numeric
language sql
stable
as $$
  select coalesce(
    sum(
      case
        when type in ('withdrawal', 'transfer_out') then -amount
        else amount
      end
    ),
    0
  )
  from transactions
  where account_id = p_account_id
    and created_at < p_before;
$$;

create or replace function apply_transaction(
  p_account_id uuid,
  p_type text,
  p_amount numeric,
  p_note text,
  p_created_by uuid
)
returns transactions
language plpgsql
as $$
declare
  account_row accounts;
  current_balance numeric;
  inserted_row transactions;
begin
  if p_type not in ('deposit', 'withdrawal') then
    raise exception 'Unsupported transaction type: %', p_type;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select *
  into account_row
  from accounts
  where id = p_account_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Account not found or inactive';
  end if;

  if p_type = 'withdrawal' then
    current_balance := get_account_balance(p_account_id);
    if p_amount > current_balance then
      raise exception 'Insufficient balance';
    end if;
  end if;

  insert into transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    created_by
  )
  values (
    p_account_id,
    p_type,
    p_amount,
    account_row.currency,
    p_note,
    null,
    p_created_by
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

create or replace function transfer_between_accounts(
  p_source_account_id uuid,
  p_target_account_id uuid,
  p_amount numeric,
  p_note text,
  p_created_by uuid
)
returns setof transactions
language plpgsql
as $$
declare
  source_account accounts;
  target_account accounts;
  source_owner_name text;
  target_owner_name text;
  source_note text;
  target_note text;
  note_suffix text;
  current_balance numeric;
begin
  if p_source_account_id = p_target_account_id then
    raise exception 'Source and target accounts must differ';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select *
  into source_account
  from accounts
  where id = p_source_account_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Source account not found or inactive';
  end if;

  select *
  into target_account
  from accounts
  where id = p_target_account_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Target account not found or inactive';
  end if;

  if source_account.currency <> target_account.currency then
    raise exception 'Transfer currency mismatch';
  end if;

  current_balance := get_account_balance(p_source_account_id);
  if p_amount > current_balance then
    raise exception 'Insufficient balance';
  end if;

  select name
  into source_owner_name
  from app_users
  where id = source_account.owner_child_id;

  select name
  into target_owner_name
  from app_users
  where id = target_account.owner_child_id;

  note_suffix := case
    when p_note is null or btrim(p_note) = '' then ' （无备注）'
    else ' - ' || btrim(p_note)
  end;

  source_note := '转出至 ' || coalesce(target_owner_name, '') || ' ' || target_account.name || note_suffix;
  target_note := '来自 ' || coalesce(source_owner_name, '') || ' ' || source_account.name || note_suffix;

  return query
  insert into transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    created_by
  )
  values (
    source_account.id,
    'transfer_out',
    p_amount,
    source_account.currency,
    source_note,
    target_account.id,
    p_created_by
  )
  returning *;

  return query
  insert into transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    created_by
  )
  values (
    target_account.id,
    'transfer_in',
    p_amount,
    target_account.currency,
    target_note,
    source_account.id,
    p_created_by
  )
  returning *;
end;
$$;

drop function if exists run_monthly_interest(date);

drop function if exists run_monthly_interest();

create function run_monthly_interest()
returns void
language plpgsql
as $$
declare
  config_rate numeric(5, 2);
  config_timezone text;
  now_local timestamp;
  last_month_start date;
  earliest_month date;
  latest_settled_month date;
  start_month date;
  current_month date;
  month_end date;
  month_prefix text;
  month_note text;
begin
  select annual_rate, timezone
  into config_rate, config_timezone
  from settings
  limit 1;

  if config_rate is null then
    config_rate := 10.00;
  end if;

  if config_timezone is null or config_timezone = '' then
    config_timezone := 'Asia/Singapore';
  end if;

  now_local := now() at time zone config_timezone;
  last_month_start := date_trunc('month', now_local - interval '1 month')::date;

  select min(date_trunc('month', created_at at time zone config_timezone)::date)
  into earliest_month
  from transactions;

  if earliest_month is null then
    return;
  end if;

  select max(make_date(parsed.year_value, parsed.month_value, 1))
  into latest_settled_month
  from transactions
  where type = 'interest'
    and interest_month is not null;

  if latest_settled_month is null then
    start_month := earliest_month;
  else
    start_month := (latest_settled_month + interval '1 month')::date;
  end if;

  if start_month > last_month_start then
    return;
  end if;

  current_month := start_month;

  while current_month <= last_month_start loop
    month_end := (current_month + interval '1 month' - interval '1 day')::date;
    month_prefix := to_char(current_month, 'YYYY年MM月') || '结息';
    month_note := month_prefix || '，利率 ' || config_rate || '%';

    if exists (
      select 1
      from transactions
      where type = 'interest'
        and interest_month = current_month
    ) then
      current_month := (current_month + interval '1 month')::date;
      continue;
    end if;

    with days as (
      select generate_series(current_month, month_end, interval '1 day')::date as day
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
              and (transactions.created_at at time zone config_timezone) < (days.day + interval '1 day')
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
        round(sum(balance * config_rate / 100 / 365)::numeric, 2) as interest_amount
      from account_days
      group by account_id, currency
    ),
    inserted_logs as (
      insert into interest_log (account_id, month, annual_rate, interest_amount)
      select account_id, current_month, config_rate, interest_amount
      from monthly_interest
      where interest_amount > 0
        and not exists (
          select 1
          from transactions
          where type = 'interest'
            and interest_month = current_month
        )
      on conflict (account_id, month) do nothing
      returning account_id, interest_amount
    )
    insert into transactions (account_id, type, amount, currency, note, related_account_id, created_by, interest_month)
    select
      inserted_logs.account_id,
      'interest',
      inserted_logs.interest_amount,
      accounts.currency,
      month_note,
      null,
      accounts.created_by,
      current_month
    from inserted_logs
    join accounts on accounts.id = inserted_logs.account_id
    where not exists (
      select 1
      from transactions
      where type = 'interest'
        and interest_month = current_month
    );

    current_month := (current_month + interval '1 month')::date;
  end loop;
end;
$$;

insert into settings (id, annual_rate, timezone)
values ('00000000-0000-0000-0000-000000000001', 10.00, 'Asia/Singapore')
on conflict (id) do update
set annual_rate = excluded.annual_rate,
    timezone = excluded.timezone,
    updated_at = now();
