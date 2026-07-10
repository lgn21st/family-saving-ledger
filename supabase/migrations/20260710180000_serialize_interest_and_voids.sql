alter function public.run_monthly_interest()
  rename to run_monthly_interest_impl;

create function public.run_monthly_interest()
returns void
language plpgsql
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

revoke execute on function public.run_monthly_interest_impl()
  from public, anon, authenticated;

create or replace function public.void_transaction(
  p_transaction_id uuid,
  p_voided_by uuid
)
returns integer
language plpgsql
as $$
declare
  target_row public.transactions;
  target_transfer_group_id uuid;
  updated_count integer;
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
