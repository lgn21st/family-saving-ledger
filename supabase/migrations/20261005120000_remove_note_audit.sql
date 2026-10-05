-- Keep current notes and concurrency versions; note history is no longer a product feature.
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
  result_rows jsonb;
begin
  if not public.is_active_parent(p_updated_by) then
    raise exception 'Only an active parent can update transaction notes';
  end if;
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

drop table public.transaction_note_edits;
