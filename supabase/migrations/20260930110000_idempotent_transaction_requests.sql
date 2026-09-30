-- Requests are receipts on existing ledger rows; legacy callers may omit the ID.
alter table public.transactions
  add column request_id uuid,
  add column request_input jsonb,
  add constraint transactions_request_complete check (
    (request_id is null) = (request_input is null)
  );
create unique index transactions_request_idx
  on public.transactions (created_by, request_id) where request_id is not null;

-- Replace the old signatures to avoid ambiguous PostgREST overloads.
drop function public.apply_transaction(uuid, text, numeric, text, uuid);
drop function public.transfer_between_accounts(uuid, uuid, numeric, text, uuid);

create or replace function public.apply_transaction(
  p_account_id uuid,
  p_type text,
  p_amount numeric,
  p_note text,
  p_created_by uuid,
  p_request_id uuid default null
)
returns public.transactions
language plpgsql
as $$
declare
  account_row public.accounts;
  current_balance numeric;
  inserted_row public.transactions;
  previous_row public.transactions;
  request_input jsonb := jsonb_build_array(
    'apply_transaction', p_account_id, p_type, p_amount, p_note
  );
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can create transactions';
  end if;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      'ledger-request:' || p_created_by::text || ':' || p_request_id::text, 0
    ));
    select * into previous_row from public.transactions
    where created_by = p_created_by and request_id = p_request_id;
    if found then
      if previous_row.request_input is distinct from request_input then
        raise exception 'Request ID already used for different transaction';
      end if;
      return previous_row;
    end if;
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
    is_void,
    request_id,
    request_input
  )
  values (
    p_account_id,
    p_type,
    p_amount,
    account_row.currency,
    p_note,
    null,
    p_created_by,
    false,
    p_request_id,
    case when p_request_id is not null then request_input end
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
  p_created_by uuid,
  p_request_id uuid default null
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
  previous_row public.transactions;
  request_input jsonb := jsonb_build_array(
    'transfer_between_accounts', p_source_account_id, p_target_account_id, p_amount, p_note
  );
begin
  if not public.is_active_parent(p_created_by) then
    raise exception 'Only an active parent can transfer funds';
  end if;

  if p_request_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      'ledger-request:' || p_created_by::text || ':' || p_request_id::text, 0
    ));
    select * into previous_row from public.transactions
    where created_by = p_created_by and request_id = p_request_id;
    if found then
      if previous_row.request_input is distinct from request_input then
        raise exception 'Request ID already used for different transaction';
      end if;
      return query select * from public.transactions
      where transfer_group_id = previous_row.transfer_group_id
      order by case type when 'transfer_out' then 0 else 1 end;
      return;
    end if;
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
    is_void,
    request_id,
    request_input
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
    false,
    p_request_id,
    case when p_request_id is not null then request_input end
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

revoke all on function public.apply_transaction(uuid, text, numeric, text, uuid, uuid) from public;
revoke all on function public.transfer_between_accounts(uuid, uuid, numeric, text, uuid, uuid) from public;
grant execute on function public.apply_transaction(uuid, text, numeric, text, uuid, uuid)
  to anon, authenticated, service_role;
grant execute on function public.transfer_between_accounts(uuid, uuid, numeric, text, uuid, uuid)
  to anon, authenticated, service_role;
