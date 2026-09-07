-- Voiding must lock accounts, refuse inactive accounts, and refuse negative
-- post-void balances. Catch-up interest is dated at the next month start so
-- later months compound. Member/account writes go through parent-checked RPCs.
-- Monthly interest is not executable by API roles; cron still runs as postgres.

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

create or replace function public.void_transaction(
  p_transaction_id uuid,
  p_voided_by uuid
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  target_row public.transactions;
  target_transfer_group_id uuid;
  updated_count integer;
  account_ids uuid[];
  affected_account_id uuid;
  current_balance numeric;
  signed_delta numeric;
  post_balance numeric;
begin
  if not public.is_active_parent(p_voided_by) then
    raise exception 'Only an active parent can void transactions';
  end if;

  select transfer_group_id
  into target_transfer_group_id
  from public.transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if target_transfer_group_id is not null then
    select array_agg(distinct transactions.account_id order by transactions.account_id)
    into account_ids
    from public.transactions
    where transfer_group_id = target_transfer_group_id;
  else
    select array[account_id]
    into account_ids
    from public.transactions
    where id = p_transaction_id;
  end if;

  if account_ids is null or cardinality(account_ids) = 0 then
    raise exception 'Transaction not found';
  end if;

  perform id
  from public.accounts
  where id = any (account_ids)
  order by id
  for update;

  if (
    select count(*)
    from public.accounts
    where id = any (account_ids)
  ) <> cardinality(account_ids) then
    raise exception 'Account not found or inactive';
  end if;

  if exists (
    select 1
    from public.accounts
    where id = any (account_ids)
      and is_active = false
  ) then
    raise exception 'Cannot void a transaction on an inactive account';
  end if;

  if target_transfer_group_id is not null then
    perform id
    from public.transactions
    where transfer_group_id = target_transfer_group_id
    order by id
    for update;
  else
    perform id
    from public.transactions
    where id = p_transaction_id
    for update;
  end if;

  select *
  into target_row
  from public.transactions
  where id = p_transaction_id;

  if target_row.is_void then
    return 0;
  end if;

  foreach affected_account_id in array account_ids loop
    current_balance := public.get_account_balance(affected_account_id);

    select coalesce(
      sum(
        case
          when transactions.type in ('withdrawal', 'transfer_out')
            then -transactions.amount
          else transactions.amount
        end
      ),
      0
    )
    into signed_delta
    from public.transactions
    where transactions.account_id = affected_account_id
      and transactions.is_void = false
      and (
        (
          target_transfer_group_id is not null
          and transactions.transfer_group_id = target_transfer_group_id
        )
        or (
          target_transfer_group_id is null
          and transactions.id = p_transaction_id
        )
      );

    post_balance := current_balance - signed_delta;
    if post_balance < 0 then
      raise exception 'Void would result in a negative balance';
    end if;
  end loop;

  if target_transfer_group_id is not null then
    update public.transactions
    set is_void = true,
        voided_at = now(),
        voided_by = p_voided_by
    where transfer_group_id = target_transfer_group_id
      and is_void = false;
  else
    update public.transactions
    set is_void = true,
        voided_at = now(),
        voided_by = p_voided_by
    where id = p_transaction_id
      and is_void = false;
  end if;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

create or replace function public.run_monthly_interest_impl()
returns void
language plpgsql
set search_path = public
as $$
declare
  config_rate numeric(5, 2);
  config_timezone text;
  now_local timestamp;
  last_month_start date;
  earliest_month date;
  current_month date;
  month_end date;
  month_prefix text;
  month_note text;
  interest_posted_at timestamp with time zone;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('family-saving-ledger:monthly-interest', 0)
  );

  select annual_rate, timezone
  into config_rate, config_timezone
  from public.settings
  where id = '00000000-0000-0000-0000-000000000001';

  if config_rate is null then
    config_rate := 10.00;
  end if;

  if config_timezone is null or config_timezone = '' then
    config_timezone := 'Asia/Singapore';
  end if;

  now_local := now() at time zone config_timezone;
  last_month_start := date_trunc('month', now_local - interval '1 month')::date;

  select min(
    date_trunc('month', transactions.created_at at time zone config_timezone)::date
  )
  into earliest_month
  from public.transactions
  join public.accounts on accounts.id = transactions.account_id
  where transactions.is_void = false
    and accounts.is_active = true;

  if earliest_month is null or earliest_month > last_month_start then
    return;
  end if;

  current_month := earliest_month;

  while current_month <= last_month_start loop
    month_end := (current_month + interval '1 month' - interval '1 day')::date;
    month_prefix := to_char(current_month, 'YYYY年MM月') || '结息';
    month_note := month_prefix || '，利率 ' || config_rate || '%';
    interest_posted_at :=
      ((current_month + interval '1 month')::timestamp at time zone config_timezone);

    insert into public.interest_log (
      account_id,
      month,
      annual_rate,
      interest_amount
    )
    select
      transactions.account_id,
      current_month,
      config_rate,
      transactions.amount
    from public.transactions
    join public.accounts on accounts.id = transactions.account_id
    where transactions.type = 'interest'
      and transactions.interest_month = current_month
      and transactions.is_void = false
      and accounts.is_active = true
    on conflict (account_id, month) do nothing;

    with days as (
      select generate_series(
        current_month,
        month_end,
        interval '1 day'
      )::date as day
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
                when transactions.type in ('withdrawal', 'transfer_out')
                  then -transactions.amount
                else transactions.amount
              end
            )
            from public.transactions
            where transactions.account_id = accounts.id
              and transactions.is_void = false
              and (transactions.created_at at time zone config_timezone) <
                (days.day + interval '1 day')
          ),
          0
        ) as balance
      from public.accounts
      cross join days
      where accounts.is_active = true
        and date_trunc(
          'month',
          accounts.created_at at time zone config_timezone
        )::date <= current_month
    ),
    monthly_interest as (
      select
        account_id,
        currency,
        round(sum(balance * config_rate / 100 / 365)::numeric, 2)
          as interest_amount
      from account_days
      group by account_id, currency
    ),
    missing_interest as (
      select monthly_interest.*
      from monthly_interest
      where monthly_interest.interest_amount > 0
        and not exists (
          select 1
          from public.transactions
          where transactions.account_id = monthly_interest.account_id
            and transactions.type = 'interest'
            and transactions.interest_month = current_month
            and transactions.is_void = false
        )
    ),
    inserted_logs as (
      insert into public.interest_log (
        account_id,
        month,
        annual_rate,
        interest_amount
      )
      select
        missing_interest.account_id,
        current_month,
        config_rate,
        missing_interest.interest_amount
      from missing_interest
      on conflict (account_id, month) do update
      set annual_rate = excluded.annual_rate,
          interest_amount = excluded.interest_amount,
          created_at = now()
      returning account_id, interest_amount
    )
    insert into public.transactions (
      account_id,
      type,
      amount,
      currency,
      note,
      related_account_id,
      created_by,
      interest_month,
      is_void,
      created_at
    )
    select
      inserted_logs.account_id,
      'interest',
      inserted_logs.interest_amount,
      accounts.currency,
      month_note,
      null,
      accounts.created_by,
      current_month,
      false,
      interest_posted_at
    from inserted_logs
    join public.accounts on accounts.id = inserted_logs.account_id;

    current_month := (current_month + interval '1 month')::date;
  end loop;
end;
$$;

create or replace function public.run_monthly_interest()
returns void
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(
    hashtextextended('family-saving-ledger:monthly-interest', 0)
  );

  perform id
  from public.accounts
  where is_active = true
  order by id
  for update;

  perform public.run_monthly_interest_impl();
end;
$$;

create or replace function public.create_child(
  p_name text,
  p_pin text,
  p_avatar_id text,
  p_created_by uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  trimmed_name text := btrim(coalesce(p_name, ''));
  new_id uuid;
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can create children';
  end if;

  if trimmed_name = '' then
    raise exception 'Child name is required';
  end if;

  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be 4 digits';
  end if;

  if p_avatar_id is null or btrim(p_avatar_id) = '' then
    raise exception 'Avatar is required';
  end if;

  insert into public.app_users (name, role, pin, avatar_id, is_active)
  values (trimmed_name, 'child', p_pin, btrim(p_avatar_id), true)
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_child_name(
  p_child_id uuid,
  p_name text,
  p_updated_by uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  trimmed_name text := btrim(coalesce(p_name, ''));
begin
  if not public.is_active_parent(p_updated_by) then
    raise exception 'Only an active parent can update children';
  end if;

  if trimmed_name = '' then
    raise exception 'Child name is required';
  end if;

  update public.app_users
  set name = trimmed_name
  where id = p_child_id
    and role = 'child'
    and is_active = true;

  if not found then
    raise exception 'Child not found or inactive';
  end if;
end;
$$;

create or replace function public.create_account(
  p_name text,
  p_currency text,
  p_owner_child_id uuid,
  p_created_by uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  trimmed_name text := btrim(coalesce(p_name, ''));
  trimmed_currency text := upper(btrim(coalesce(p_currency, '')));
  new_id uuid;
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can create accounts';
  end if;

  if trimmed_name = '' then
    raise exception 'Account name is required';
  end if;

  if trimmed_currency not in ('SGD', 'CNY') then
    raise exception 'Unsupported currency';
  end if;

  if not exists (
    select 1
    from public.app_users
    where id = p_owner_child_id
      and role = 'child'
      and is_active = true
  ) then
    raise exception 'Account owner must be an active child';
  end if;

  insert into public.accounts (
    name,
    currency,
    owner_child_id,
    created_by,
    is_active
  )
  values (
    trimmed_name,
    trimmed_currency,
    p_owner_child_id,
    p_created_by,
    true
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.update_account_name(
  p_account_id uuid,
  p_name text,
  p_updated_by uuid
)
returns void
language plpgsql
set search_path = public
as $$
declare
  trimmed_name text := btrim(coalesce(p_name, ''));
begin
  if not public.is_active_parent(p_updated_by) then
    raise exception 'Only an active parent can update accounts';
  end if;

  if trimmed_name = '' then
    raise exception 'Account name is required';
  end if;

  update public.accounts
  set name = trimmed_name
  where id = p_account_id
    and is_active = true;

  if not found then
    raise exception 'Account not found or inactive';
  end if;
end;
$$;

grant execute on function public.create_child(text, text, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.update_child_name(uuid, text, uuid)
  to anon, authenticated, service_role;
grant execute on function public.create_account(text, text, uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.update_account_name(uuid, text, uuid)
  to anon, authenticated, service_role;

revoke execute on function public.run_monthly_interest()
  from public, anon, authenticated;
grant execute on function public.run_monthly_interest()
  to service_role;

revoke execute on function public.run_monthly_interest_impl()
  from public, anon, authenticated;
grant execute on function public.run_monthly_interest_impl()
  to service_role;
