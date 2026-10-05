-- System interest is read-only through ordinary transaction commands.
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

  -- Check every affected row while locked, including legacy transfer groups.
  if exists (
    select 1 from public.transactions
    where type = 'interest' and (
      id = p_transaction_id or
      (target_transfer_group_id is not null and transfer_group_id = target_transfer_group_id)
    )
  ) then
    raise exception 'Interest transactions cannot be voided';
  end if;

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
