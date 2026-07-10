alter table public.app_users
  add column if not exists is_active boolean not null default true,
  add column if not exists archived_at timestamp with time zone,
  add column if not exists archived_by uuid references public.app_users(id);

alter table public.accounts
  add column if not exists closed_at timestamp with time zone,
  add column if not exists closed_by uuid references public.app_users(id);

update public.accounts
set closed_at = coalesce(closed_at, now())
where is_active = false;

create index if not exists accounts_owner_child_id_idx
  on public.accounts (owner_child_id);

create index if not exists accounts_created_by_idx
  on public.accounts (created_by);

create index if not exists accounts_closed_by_idx
  on public.accounts (closed_by)
  where closed_by is not null;

create index if not exists app_users_archived_by_idx
  on public.app_users (archived_by)
  where archived_by is not null;

create index if not exists transactions_related_account_id_idx
  on public.transactions (related_account_id)
  where related_account_id is not null;

create index if not exists transactions_transfer_group_id_idx
  on public.transactions (transfer_group_id)
  where transfer_group_id is not null;

create index if not exists transactions_created_by_idx
  on public.transactions (created_by);

create index if not exists transactions_voided_by_idx
  on public.transactions (voided_by)
  where voided_by is not null;

create or replace function public.is_active_parent(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.app_users
    where id = p_user_id
      and role = 'parent'
      and is_active = true
  );
$$;

create or replace function public.apply_transaction(
  p_account_id uuid,
  p_type text,
  p_amount numeric,
  p_note text,
  p_created_by uuid
)
returns public.transactions
language plpgsql
as $$
declare
  account_row public.accounts;
  current_balance numeric;
  inserted_row public.transactions;
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can create transactions';
  end if;

  if p_type not in ('deposit', 'withdrawal') then
    raise exception 'Unsupported transaction type: %', p_type;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select *
  into account_row
  from public.accounts
  where id = p_account_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Account not found or inactive';
  end if;

  if p_type = 'withdrawal' then
    current_balance := public.get_account_balance(p_account_id);
    if p_amount > current_balance then
      raise exception 'Insufficient balance';
    end if;
  end if;

  insert into public.transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    created_by,
    is_void
  )
  values (
    p_account_id,
    p_type,
    p_amount,
    account_row.currency,
    p_note,
    null,
    p_created_by,
    false
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;

create or replace function public.transfer_between_accounts(
  p_source_account_id uuid,
  p_target_account_id uuid,
  p_amount numeric,
  p_note text,
  p_created_by uuid
)
returns setof public.transactions
language plpgsql
as $$
declare
  source_account public.accounts;
  target_account public.accounts;
  source_owner_name text;
  target_owner_name text;
  source_note text;
  target_note text;
  note_suffix text;
  current_balance numeric;
  transfer_group uuid := gen_random_uuid();
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can transfer funds';
  end if;

  if p_source_account_id = p_target_account_id then
    raise exception 'Source and target accounts must differ';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  perform id
  from public.accounts
  where id in (p_source_account_id, p_target_account_id)
  order by id
  for update;

  select *
  into source_account
  from public.accounts
  where id = p_source_account_id
    and is_active = true;

  if not found then
    raise exception 'Source account not found or inactive';
  end if;

  select *
  into target_account
  from public.accounts
  where id = p_target_account_id
    and is_active = true;

  if not found then
    raise exception 'Target account not found or inactive';
  end if;

  if source_account.currency <> target_account.currency then
    raise exception 'Transfer currency mismatch';
  end if;

  current_balance := public.get_account_balance(p_source_account_id);
  if p_amount > current_balance then
    raise exception 'Insufficient balance';
  end if;

  select name
  into source_owner_name
  from public.app_users
  where id = source_account.owner_child_id;

  select name
  into target_owner_name
  from public.app_users
  where id = target_account.owner_child_id;

  note_suffix := case
    when p_note is null or btrim(p_note) = '' then ' （无备注）'
    else ' - ' || btrim(p_note)
  end;

  source_note := '转出至 ' || coalesce(target_owner_name, '') || ' ' || target_account.name || note_suffix;
  target_note := '来自 ' || coalesce(source_owner_name, '') || ' ' || source_account.name || note_suffix;

  return query
  insert into public.transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    transfer_group_id,
    created_by,
    is_void
  )
  values (
    source_account.id,
    'transfer_out',
    p_amount,
    source_account.currency,
    source_note,
    target_account.id,
    transfer_group,
    p_created_by,
    false
  )
  returning *;

  return query
  insert into public.transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    related_account_id,
    transfer_group_id,
    created_by,
    is_void
  )
  values (
    target_account.id,
    'transfer_in',
    p_amount,
    target_account.currency,
    target_note,
    source_account.id,
    transfer_group,
    p_created_by,
    false
  )
  returning *;
end;
$$;

create or replace function public.void_transaction(
  p_transaction_id uuid,
  p_voided_by uuid
)
returns integer
language plpgsql
as $$
declare
  target_row public.transactions;
  updated_count integer;
begin
  if not public.is_active_parent(p_voided_by) then
    raise exception 'Only an active parent can void transactions';
  end if;

  select *
  into target_row
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if target_row.is_void then
    return 0;
  end if;

  if target_row.transfer_group_id is not null then
    update public.transactions
    set is_void = true,
        voided_at = now(),
        voided_by = p_voided_by
    where transfer_group_id = target_row.transfer_group_id
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

create or replace function public.close_account(
  p_account_id uuid,
  p_closed_by uuid
)
returns public.accounts
language plpgsql
as $$
declare
  account_row public.accounts;
  current_balance numeric;
begin
  if not public.is_active_parent(p_closed_by) then
    raise exception 'Only an active parent can close accounts';
  end if;

  select *
  into account_row
  from public.accounts
  where id = p_account_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Account not found or inactive';
  end if;

  current_balance := public.get_account_balance(p_account_id);
  if current_balance <> 0 then
    raise exception 'Account balance must be zero before closing';
  end if;

  update public.accounts
  set is_active = false,
      closed_at = now(),
      closed_by = p_closed_by
  where id = p_account_id
  returning * into account_row;

  return account_row;
end;
$$;

create or replace function public.archive_child(
  p_child_id uuid,
  p_archived_by uuid
)
returns integer
language plpgsql
as $$
declare
  child_row public.app_users;
  nonzero_account_id uuid;
  archived_account_count integer;
begin
  if not public.is_active_parent(p_archived_by) then
    raise exception 'Only an active parent can archive children';
  end if;

  select *
  into child_row
  from public.app_users
  where id = p_child_id
    and role = 'child'
    and is_active = true
  for update;

  if not found then
    raise exception 'Child not found or inactive';
  end if;

  perform id
  from public.accounts
  where owner_child_id = p_child_id
    and is_active = true
  order by id
  for update;

  select id
  into nonzero_account_id
  from public.accounts
  where owner_child_id = p_child_id
    and is_active = true
    and public.get_account_balance(id) <> 0
  order by id
  limit 1;

  if nonzero_account_id is not null then
    raise exception 'All child account balances must be zero before archiving';
  end if;

  update public.accounts
  set is_active = false,
      closed_at = now(),
      closed_by = p_archived_by
  where owner_child_id = p_child_id
    and is_active = true;

  get diagnostics archived_account_count = row_count;

  update public.app_users
  set is_active = false,
      archived_at = now(),
      archived_by = p_archived_by
  where id = p_child_id;

  return archived_account_count;
end;
$$;

create or replace function public.run_monthly_interest()
returns void
language plpgsql
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
      is_void
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
      false
    from inserted_logs
    join public.accounts on accounts.id = inserted_logs.account_id;

    current_month := (current_month + interval '1 month')::date;
  end loop;
end;
$$;
