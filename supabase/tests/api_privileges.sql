do $test$
declare
  role_name text;
  relation_name text;
  function_name text;
begin
  foreach role_name in array array['anon', 'authenticated', 'service_role'] loop
    foreach relation_name in array array[
      'public.app_users',
      'public.accounts',
      'public.transactions',
      'public.interest_log',
      'public.settings',
      'public.account_balances'
    ] loop
      if not has_table_privilege(role_name, relation_name, 'SELECT') then
        raise exception '% lacks SELECT on %', role_name, relation_name;
      end if;
    end loop;

    foreach function_name in array array[
      'public.apply_transaction(uuid,text,numeric,text,uuid)',
      'public.transfer_between_accounts(uuid,uuid,numeric,text,uuid)',
      'public.void_transaction(uuid,uuid)',
      'public.close_account(uuid,uuid)',
      'public.archive_child(uuid,uuid)',
      'public.get_account_balance(uuid)',
      'public.get_balance_before_date(uuid,timestamp with time zone)',
      'public.is_active_parent(uuid)',
      'public.run_monthly_interest()'
    ] loop
      if not has_function_privilege(role_name, function_name, 'EXECUTE') then
        raise exception '% lacks EXECUTE on %', role_name, function_name;
      end if;
    end loop;
  end loop;

  if has_function_privilege(
    'anon',
    'public.run_monthly_interest_impl()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.run_monthly_interest_impl()',
    'EXECUTE'
  ) then
    raise exception 'Internal interest implementation is exposed to API roles';
  end if;

  execute 'set local role anon';
  perform 1 from public.app_users limit 0;
  perform 1 from public.account_balances limit 0;
  execute 'reset role';

  raise exception 'API_PRIVILEGE_TESTS_PASSED';
end;
$test$;
