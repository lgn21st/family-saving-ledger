do $test$
declare
  parent_id uuid := gen_random_uuid();
  interest_child_a_id uuid := gen_random_uuid();
  interest_child_b_id uuid := gen_random_uuid();
  zero_child_id uuid := gen_random_uuid();
  interest_account_a_id uuid := gen_random_uuid();
  interest_account_b_id uuid := gen_random_uuid();
  zero_close_account_id uuid := gen_random_uuid();
  zero_archive_account_id uuid := gen_random_uuid();
  test_month date := date_trunc(
    'month',
    (now() at time zone 'Asia/Singapore') - interval '1 month'
  )::date;
  test_created_at timestamptz;
  interest_count integer;
  transfer_row_count integer;
  transfer_group_count integer;
  transfer_transaction_id uuid;
  created_transfer_group_id uuid;
  close_failure_observed boolean := false;
  archive_failure_observed boolean := false;
  role_failure_observed boolean := false;
begin
  perform set_config('client_min_messages', 'warning', true);

  test_created_at :=
    test_month::timestamp at time zone 'Asia/Singapore' + interval '1 hour';

  update public.accounts
  set is_active = false
  where is_active = true;

  insert into public.app_users (id, name, role, pin, is_active)
  values
    (parent_id, '风险测试家长', 'parent', '9000', true),
    (interest_child_a_id, '风险测试孩子甲', 'child', '9001', true),
    (interest_child_b_id, '风险测试孩子乙', 'child', '9002', true),
    (zero_child_id, '风险测试零余额孩子', 'child', '9003', true);

  insert into public.accounts (
    id,
    name,
    currency,
    owner_child_id,
    created_by,
    is_active,
    created_at
  )
  values
    (
      interest_account_a_id,
      '风险测试利息甲',
      'CNY',
      interest_child_a_id,
      parent_id,
      true,
      test_created_at
    ),
    (
      interest_account_b_id,
      '风险测试利息乙',
      'CNY',
      interest_child_b_id,
      parent_id,
      true,
      test_created_at
    ),
    (
      zero_close_account_id,
      '风险测试关闭账户',
      'CNY',
      zero_child_id,
      parent_id,
      true,
      test_created_at
    ),
    (
      zero_archive_account_id,
      '风险测试归档账户',
      'CNY',
      zero_child_id,
      parent_id,
      true,
      test_created_at
    );

  insert into public.transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    created_by,
    created_at,
    is_void
  )
  values
    (
      interest_account_a_id,
      'deposit',
      36500,
      'CNY',
      '风险测试本金甲',
      parent_id,
      test_created_at,
      false
    ),
    (
      interest_account_b_id,
      'deposit',
      36500,
      'CNY',
      '风险测试本金乙',
      parent_id,
      test_created_at,
      false
    );

  insert into public.transactions (
    account_id,
    type,
    amount,
    currency,
    note,
    created_by,
    created_at,
    interest_month,
    is_void
  )
  values (
    interest_account_a_id,
    'interest',
    1,
    'CNY',
    '风险测试预置部分结息',
    parent_id,
    test_created_at,
    test_month,
    false
  );

  insert into public.interest_log (
    account_id,
    month,
    annual_rate,
    interest_amount
  )
  values (interest_account_a_id, test_month, 10, 1);

  perform public.run_monthly_interest();

  select count(*)
  into interest_count
  from public.transactions
  where account_id = interest_account_b_id
    and type = 'interest'
    and interest_month = test_month
    and is_void = false;

  if interest_count <> 1 then
    raise exception 'Expected missing per-account interest to be inserted once';
  end if;

  perform public.run_monthly_interest();

  select count(*)
  into interest_count
  from public.transactions
  where account_id in (interest_account_a_id, interest_account_b_id)
    and type = 'interest'
    and interest_month = test_month
    and is_void = false;

  if interest_count <> 2 then
    raise exception 'Monthly interest rerun was not idempotent per account';
  end if;

  select
    count(*),
    count(distinct transfer_group_id),
    min(id::text)::uuid,
    min(transfer_group_id::text)::uuid
  into
    transfer_row_count,
    transfer_group_count,
    transfer_transaction_id,
    created_transfer_group_id
  from public.transfer_between_accounts(
    interest_account_b_id,
    interest_account_a_id,
    10,
    '风险测试转账',
    parent_id
  );

  if transfer_row_count <> 2 or transfer_group_count <> 1 then
    raise exception 'Transfer pair was not created atomically';
  end if;

  if public.void_transaction(transfer_transaction_id, parent_id) <> 2 then
    raise exception 'Transfer pair was not voided together';
  end if;

  if (
    select count(*)
    from public.transactions
    where transfer_group_id = created_transfer_group_id
      and is_void = true
  ) <> 2 then
    raise exception 'Transfer pair void state is inconsistent';
  end if;

  perform public.close_account(zero_close_account_id, parent_id);

  if not exists (
    select 1
    from public.accounts
    where id = zero_close_account_id
      and is_active = false
      and closed_at is not null
      and closed_by = parent_id
  ) then
    raise exception 'Zero-balance account was not closed with audit fields';
  end if;

  begin
    perform public.close_account(interest_account_b_id, parent_id);
  exception
    when others then
      close_failure_observed :=
        position('balance must be zero' in sqlerrm) > 0;
  end;

  if not close_failure_observed then
    raise exception 'Nonzero account closure was not rejected';
  end if;

  perform public.archive_child(zero_child_id, parent_id);

  if not exists (
    select 1
    from public.app_users
    where id = zero_child_id
      and is_active = false
      and archived_at is not null
      and archived_by = parent_id
  ) then
    raise exception 'Child was not archived with audit fields';
  end if;

  if not exists (
    select 1
    from public.accounts
    where id = zero_archive_account_id
      and is_active = false
  ) then
    raise exception 'Active zero-balance child account was not archived';
  end if;

  begin
    perform public.archive_child(interest_child_a_id, parent_id);
  exception
    when others then
      archive_failure_observed :=
        position('balances must be zero' in sqlerrm) > 0;
  end;

  if not archive_failure_observed then
    raise exception 'Nonzero child account archival was not rejected';
  end if;

  begin
    perform public.apply_transaction(
      interest_account_a_id,
      'deposit',
      1,
      '风险测试越权',
      interest_child_a_id
    );
  exception
    when others then
      role_failure_observed :=
        position('active parent' in sqlerrm) > 0;
  end;

  if not role_failure_observed then
    raise exception 'Child mutation through ledger RPC was not rejected';
  end if;

  if to_regclass('public.transactions_transfer_group_id_idx') is null
    or to_regclass('public.accounts_owner_child_id_idx') is null
    or to_regclass('public.transactions_related_account_id_idx') is null
  then
    raise exception 'Expected ledger indexes are missing';
  end if;

  raise exception 'BUSINESS_RISK_TESTS_PASSED';
end;
$test$;
