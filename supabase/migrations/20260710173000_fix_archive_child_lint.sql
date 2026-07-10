create or replace function public.archive_child(
  p_child_id uuid,
  p_archived_by uuid
)
returns integer
language plpgsql
as $$
declare
  nonzero_account_id uuid;
  archived_account_count integer;
begin
  if not public.is_active_parent(p_archived_by) then
    raise exception 'Only an active parent can archive children';
  end if;

  perform 1
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
