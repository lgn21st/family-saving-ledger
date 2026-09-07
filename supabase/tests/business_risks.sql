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
  insufficient_failure_observed boolean := false;
  void_negative_failure_observed boolean := false;
  void_closed_failure_observed boolean := false;
  catchup_child_id uuid := gen_random_uuid();
  catchup_account_id uuid := gen_random_uuid();
  void_child_id uuid := gen_random_uuid();
  void_account_id uuid := gen_random_uuid();
  closed_void_account_id uuid := gen_random_uuid();
  prior_month date;
  catchup_created_at timestamptz;
  jan_interest numeric;
  feb_interest numeric;
  jan_days integer;
  feb_days integer;
  expected_feb numeric;
  void_deposit_id uuid;
  closed_withdrawal_id uuid;
  voided_balance numeric;
begin
  perform set_config('client_min_messages', 'warning', true);

  test_created_at :=
    test_month::timestamp at time zone 'Asia/Singapore' + interval '1 hour';
  prior_month := (test_month - interval '1 month')::date;
  catchup_created_at :=
    prior_month::timestamp at time zone 'Asia/Singapore' + interval '1 hour';

  update public.accounts
  set is_active = false
  where is_active = true;

  insert into public.app_users (id, name, role, pin, is_active)
  values
    (parent_id, '风险测试家长', 'parent', '9000', true),
    (interest_child_a_id, '风险测试孩子甲', 'child', '9001', true),
    (interest_child_b_id, '风险测试孩子乙', 'child', '9002', true),
    (zero_child_id, '风险测试零余额孩子', 'child', '9003', true),
    (catchup_child_id, '风险测试补结孩子', 'child', '9004', true),
    (void_child_id, '风险测试作废孩子', 'child', '9005', true);

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
    ),
    (
      catchup_account_id,
      '风险测试补结账户',
      'CNY',
      catchup_child_id,
      parent_id,
      true,
      catchup_created_at
    ),
    (
      void_account_id,
      '风险测试作废账户',
      'CNY',
      void_child_id,
      parent_id,
      true,
      now()
    ),
    (
      closed_void_account_id,
      '风险测试关户作废账户',
      'CNY',
      void_child_id,
      parent_id,
      true,
      now()
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
    ),
    (
      catchup_account_id,
      'deposit',
      36500,
      'CNY',
      '风险测试补结本金',
      parent_id,
      catchup_created_at,
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

  select amount
  into jan_interest
  from public.transactions
  where account_id = catchup_account_id
    and type = 'interest'
    and interest_month = prior_month
    and is_void = false;

  select amount
  into feb_interest
  from public.transactions
  where account_id = catchup_account_id
    and type = 'interest'
    and interest_month = test_month
    and is_void = false;

  if jan_interest is null or feb_interest is null then
    raise exception 'Catch-up interest did not settle both months';
  end if;

  jan_days := (
    (prior_month + interval '1 month' - interval '1 day')::date - prior_month + 1
  );
  feb_days := (
    (test_month + interval '1 month' - interval '1 day')::date - test_month + 1
  );
  expected_feb := round(
    ((36500 + jan_interest) * 10 / 100 / 365 * feb_days)::numeric,
    2
  );

  if feb_interest <> expected_feb then
    raise exception
      'Catch-up interest did not compound: expected %, got %',
      expected_feb,
      feb_interest;
  end if;

  if jan_interest <> round((36500 * 10 / 100 / 365 * jan_days)::numeric, 2) then
    raise exception
      'Prior-month interest amount was %, expected %',
      jan_interest,
      round((36500 * 10 / 100 / 365 * jan_days)::numeric, 2);
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

  begin
    perform public.apply_transaction(
      interest_account_a_id,
      'withdrawal',
      999999,
      '风险测试超额支取',
      parent_id
    );
  exception
    when others then
      insufficient_failure_observed :=
        position('Insufficient balance' in sqlerrm) > 0;
  end;

  if not insufficient_failure_observed then
    raise exception 'Overdraft withdrawal was not rejected';
  end if;

  void_deposit_id := (
    select id
    from public.apply_transaction(
      void_account_id,
      'deposit',
      100,
      '风险测试作废存款',
      parent_id
    )
  );

  perform public.apply_transaction(
    void_account_id,
    'withdrawal',
    80,
    '风险测试作废后取款',
    parent_id
  );

  if public.get_account_balance(void_account_id) <> 20 then
    raise exception 'Expected remaining balance 20 before void';
  end if;

  begin
    perform public.void_transaction(void_deposit_id, parent_id);
  exception
    when others then
      void_negative_failure_observed :=
        position('negative balance' in sqlerrm) > 0;
  end;

  if not void_negative_failure_observed then
    raise exception 'Voiding a credit into a negative balance was not rejected';
  end if;

  if public.get_account_balance(void_account_id) <> 20 then
    raise exception 'Rejected void must leave the balance unchanged';
  end if;

  perform public.apply_transaction(
    void_account_id,
    'deposit',
    5,
    '风险测试作废忽略',
    parent_id
  );

  void_deposit_id := (
    select id
    from public.transactions
    where account_id = void_account_id
      and note = '风险测试作废忽略'
      and is_void = false
    order by created_at desc
    limit 1
  );

  if public.void_transaction(void_deposit_id, parent_id) <> 1 then
    raise exception 'Safe credit void was not applied';
  end if;

  if public.get_account_balance(void_account_id) <> 20 then
    raise exception 'Voided rows must be excluded from balance';
  end if;

  perform public.apply_transaction(
    closed_void_account_id,
    'deposit',
    50,
    '风险测试关户前存入',
    parent_id
  );

  closed_withdrawal_id := (
    select id
    from public.apply_transaction(
      closed_void_account_id,
      'withdrawal',
      50,
      '风险测试关户前取出',
      parent_id
    )
  );

  perform public.close_account(closed_void_account_id, parent_id);

  begin
    perform public.void_transaction(closed_withdrawal_id, parent_id);
  exception
    when others then
      void_closed_failure_observed :=
        position('inactive account' in sqlerrm) > 0;
  end;

  if not void_closed_failure_observed then
    raise exception 'Voiding a transaction on a closed account was not rejected';
  end if;

  select coalesce(balance, 0)
  into voided_balance
  from public.account_balances
  where account_id = closed_void_account_id;

  if voided_balance <> 0 then
    raise exception 'Closed account balance changed after rejected void';
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
