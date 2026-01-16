create extension if not exists pg_cron;

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  annual_rate numeric(5, 2) not null,
  timezone text not null default 'Asia/Singapore',
  updated_at timestamp with time zone default now()
);

insert into settings (id, annual_rate, timezone)
values ('00000000-0000-0000-0000-000000000001', 10.00, 'Asia/Singapore')
on conflict (id) do update
set annual_rate = excluded.annual_rate,
    timezone = excluded.timezone,
    updated_at = now();

drop table if exists interest_config;

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
  from (
    select
      substring(note from '([0-9]{4})')::int as year_value,
      substring(note from '年([0-9]{1,2})月结息')::int as month_value
    from transactions
    where type = 'interest'
      and note ~ '^[0-9]{4}年[0-9]{1,2}月结息'
  ) as parsed;

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
        and note like month_prefix || '%'
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
            and note like month_prefix || '%'
        )
      on conflict (account_id, month) do nothing
      returning account_id, interest_amount
    )
    insert into transactions (account_id, type, amount, currency, note, related_account_id, created_by)
    select
      inserted_logs.account_id,
      'interest',
      inserted_logs.interest_amount,
      accounts.currency,
      month_note,
      null,
      accounts.created_by
    from inserted_logs
    join accounts on accounts.id = inserted_logs.account_id
    where not exists (
      select 1
      from transactions
      where type = 'interest'
        and note like month_prefix || '%'
    );

    current_month := (current_month + interval '1 month')::date;
  end loop;
end;
$$;

select cron.unschedule('monthly-interest-calculation')
where exists (
  select 1 from cron.job where jobname = 'monthly-interest-calculation'
);

select cron.schedule(
  'monthly-interest-calculation',
  '0 1 1 * *',
  $$ select run_monthly_interest(); $$
);
