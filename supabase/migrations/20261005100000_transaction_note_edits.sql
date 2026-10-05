-- Notes are metadata. Preserve ledger facts and original request receipts.
alter table public.transactions
  add column note_prefix text,
  add column note_revision integer not null default 0 check (note_revision >= 0);

-- Use the original request when available (including the incoming transfer row).
-- Otherwise use the exact current account label. Never guess a delimiter inside a name.
with transfer_notes as (
  select t.id, t.note,
    case when t.type = 'transfer_out' then '转出至 ' else '来自 ' end
      || u.name || ' ' || a.name as current_prefix,
    r.request_input ->> 4 as original_note,
    r.request_input is not null as has_receipt
  from public.transactions t
  join public.accounts a on a.id = t.related_account_id
  join public.app_users u on u.id = a.owner_child_id
  left join public.transactions r
    on r.transfer_group_id = t.transfer_group_id and r.type = 'transfer_out'
  where t.type in ('transfer_in', 'transfer_out')
), suffixes as (
  select *, case when nullif(btrim(original_note), '') is null then ' （无备注）'
    else ' - ' || btrim(original_note) end as original_suffix
  from transfer_notes
)
update public.transactions t
set note_prefix = case
  when s.has_receipt and right(s.note, length(s.original_suffix)) = s.original_suffix
    then left(s.note, length(s.note) - length(s.original_suffix))
  when s.note = s.current_prefix || ' （无备注）'
    or starts_with(s.note, s.current_prefix || ' - ') then s.current_prefix
  when right(s.note, length(' （无备注）')) = ' （无备注）' and strpos(s.note, ' - ') = 0
    then left(s.note, length(s.note) - length(' （无备注）'))
  else null -- Unrecognizable legacy text is preserved and cannot be edited automatically.
end
from suffixes s where t.id = s.id;

alter table public.transactions add column user_note text generated always as (
  case when type in ('transfer_in', 'transfer_out') then
    case when note_prefix is null or note = note_prefix || ' （无备注）' then null
      else nullif(substr(note, length(note_prefix) + 4), '') end
    else nullif(note, '') end
) stored;

create table public.transaction_note_edits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id),
  revision integer not null,
  old_note text,
  new_note text,
  updated_by uuid not null references public.app_users(id),
  updated_by_name text not null,
  updated_at timestamptz not null default now(),
  unique (transaction_id, revision)
);
alter table public.transaction_note_edits enable row level security;
-- Match the trusted-family API model; the command checks the active parent.
create policy allow_all_transaction_note_edits on public.transaction_note_edits
  for all to anon, authenticated using (true) with check (true);
grant all on public.transaction_note_edits to anon, authenticated, service_role;

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
set search_path = public
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
    note_prefix,
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
    left(source_note, length(source_note) - length(note_suffix)),
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
    note_prefix,
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
    left(target_note, length(target_note) - length(note_suffix)),
    source_account.id,
    transfer_group,
    p_created_by,
    false
  )
  returning *;
end;
$$;

create or replace function public.update_transaction_note(
  p_transaction_id uuid,
  p_note text,
  p_expected_revision integer,
  p_updated_by uuid
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  target_row public.transactions;
  row_ids uuid[];
  account_ids uuid[];
  normalized_note text := nullif(btrim(p_note), '');
  actor_name text;
  result_rows jsonb;
begin
  if not public.is_active_parent(p_updated_by) then
    raise exception 'Only an active parent can update transaction notes';
  end if;
  select name into actor_name from public.app_users where id = p_updated_by;
  select * into target_row from public.transactions where id = p_transaction_id;
  if not found then raise exception 'Transaction not found'; end if;

  select array_agg(id order by id), array_agg(distinct account_id order by account_id)
  into row_ids, account_ids from public.transactions
  where id = p_transaction_id or
    (target_row.transfer_group_id is not null and transfer_group_id = target_row.transfer_group_id);

  -- Same account-then-row lock order as voiding; editing either transfer side is atomic.
  perform id from public.accounts where id = any(account_ids) order by id for update;
  perform id from public.transactions where id = any(row_ids) order by id for update;
  select * into target_row from public.transactions where id = p_transaction_id;

  if exists (select 1 from public.transactions where id = any(row_ids)
    and (is_void or type = 'interest')) then
    raise exception 'Cannot edit notes of voided or interest transactions';
  end if;
  if target_row.type in ('transfer_in', 'transfer_out') then
    if cardinality(row_ids) <> 2 or exists (
      select 1 from public.transactions where id = any(row_ids) and note_prefix is null
    ) then raise exception 'Legacy transfer note cannot be separated safely'; end if;
  end if;

  if p_expected_revision is distinct from target_row.note_revision then
    select jsonb_agg(to_jsonb(t) order by t.id) into result_rows
      from public.transactions t where id = any(row_ids);
    return jsonb_build_object('conflict', true, 'transactions', result_rows);
  end if;
  if normalized_note is distinct from nullif(btrim(target_row.user_note), '') then
    insert into public.transaction_note_edits (
      transaction_id, revision, old_note, new_note, updated_by, updated_by_name
    ) select id, note_revision + 1, user_note, normalized_note, p_updated_by, actor_name
      from public.transactions where id = any(row_ids);
    update public.transactions set
      note = case when type in ('transfer_in', 'transfer_out') then note_prefix ||
        case when normalized_note is null then ' （无备注）' else ' - ' || normalized_note end
        else normalized_note end,
      note_revision = note_revision + 1
    where id = any(row_ids);
  end if;
  select jsonb_agg(to_jsonb(t) order by t.id) into result_rows
    from public.transactions t where id = any(row_ids);
  return jsonb_build_object('conflict', false, 'transactions', result_rows);
end;
$$;
revoke all on function public.update_transaction_note(uuid, text, integer, uuid) from public;
grant execute on function public.update_transaction_note(uuid, text, integer, uuid)
  to anon, authenticated, service_role;
