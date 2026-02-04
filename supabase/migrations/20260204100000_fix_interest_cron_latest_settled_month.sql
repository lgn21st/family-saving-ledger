-- Fix: run_monthly_interest() referenced an undefined alias `parsed`
-- which caused pg_cron job `monthly-interest-calculation` to fail.
-- This migration replaces the function and (optionally) backfills
-- interest_month for legacy interest rows that only encoded month in note.

create or replace function run_monthly_interest()
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
  -- Backfill (best-effort): old interest rows may not have interest_month.
  update transactions
  set interest_month = make_date(
    substring(note from '([0-9]{4})')::int,
    substring(note from '年([0-9]{1,2})月结息')::int,
    1
  )
  where type = 'interest'
    and interest_month is null
    and note ~ '^[0-9]{4}年[0-9]{1,2}月结息';

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
  from transactions
  where is_void = false;

  if earliest_month is null then
    return;
  end if;

  select max(interest_month)
  into latest_settled_month
  from transactions
  where type = 'interest'
    and interest_month is not null
    and is_void = false;

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
        and is_void = false
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
              and transactions.is_void = false
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
            and is_void = false
        )
      on conflict (account_id, month) do nothing
      returning account_id, interest_amount
    )
    insert into transactions (account_id, type, amount, currency, note, related_account_id, created_by, interest_month, is_void)
    select
      inserted_logs.account_id,
      'interest',
      inserted_logs.interest_amount,
      accounts.currency,
      month_note,
      null,
      accounts.created_by,
      current_month,
      false
    from inserted_logs
    join accounts on accounts.id = inserted_logs.account_id
    where not exists (
      select 1
      from transactions
      where type = 'interest'
        and interest_month = current_month
        and is_void = false
    );

    current_month := (current_month + interval '1 month')::date;
  end loop;
end;
$$;

