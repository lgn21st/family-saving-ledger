\set ON_ERROR_STOP on

do $$
declare
  violation_count bigint;
begin
  select count(*) into violation_count
  from public.accounts account_row
  join public.app_users owner_row on owner_row.id = account_row.owner_child_id
  join public.app_users creator_row on creator_row.id = account_row.created_by
  where owner_row.role <> 'child' or creator_row.role <> 'parent';
  if violation_count > 0 then
    raise exception '发现 % 个账户的 owner/creator 角色不合法', violation_count;
  end if;

  select count(*) into violation_count
  from public.transactions transaction_row
  join public.accounts account_row on account_row.id = transaction_row.account_id
  where transaction_row.amount <= 0
     or transaction_row.currency <> account_row.currency;
  if violation_count > 0 then
    raise exception '发现 % 条金额或币种不合法的交易', violation_count;
  end if;

  select count(*) into violation_count
  from (
    select transfer_group_id
    from public.transactions
    where transfer_group_id is not null
    group by transfer_group_id
    having count(*) <> 2
       or count(*) filter (where type = 'transfer_in') <> 1
       or count(*) filter (where type = 'transfer_out') <> 1
       or min(amount) <> max(amount)
       or min(currency) <> max(currency)
       or count(distinct (is_void, voided_at is null)) <> 1
  ) invalid_transfer_group;
  if violation_count > 0 then
    raise exception '发现 % 个不完整或不一致的转账组', violation_count;
  end if;

  select count(*) into violation_count
  from public.account_balances
  where balance < 0;
  if violation_count > 0 then
    raise exception '发现 % 个负余额账户', violation_count;
  end if;

  select count(*) into violation_count
  from public.accounts account_row
  left join public.account_balances balance_row on balance_row.account_id = account_row.id
  where account_row.is_active = false
    and coalesce(balance_row.balance, 0) <> 0;
  if violation_count > 0 then
    raise exception '发现 % 个非零余额的已关闭账户', violation_count;
  end if;
end
$$;

select 'ledger_sync_validation_ok' as result;
