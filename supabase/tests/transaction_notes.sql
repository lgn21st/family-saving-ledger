do $test$
declare
  parent_id uuid := gen_random_uuid();
  child_id uuid := gen_random_uuid();
  source_id uuid := gen_random_uuid();
  target_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  transfer_request_id uuid := gen_random_uuid();
  original public.transactions;
  edited public.transactions;
  incoming public.transactions;
  outgoing public.transactions;
  replay public.transactions;
  response jsonb;
  rejected boolean;
  balance_before numeric;
  original_prefix text;
begin
  insert into public.app_users (id, name, role, pin, is_active) values
    (parent_id, '备注测试家长', 'parent', '9100', true),
    (child_id, '备注测试孩子 - 甲', 'child', '9101', true);
  insert into public.accounts (id, name, currency, owner_child_id, created_by) values
    (source_id, '源账户 - 储蓄', 'CNY', child_id, parent_id),
    (target_id, '目标账户 - 零用', 'CNY', child_id, parent_id);
  original := public.apply_transaction(source_id, 'deposit', 100, '原备注', parent_id, request_id);
  balance_before := public.get_account_balance(source_id);

  -- The API role can read audit history and call the parent-checked command.
  execute 'set local role anon';
  response := public.update_transaction_note(original.id, '  正确备注  ', 0, parent_id);
  perform 1 from public.transaction_note_edits where transaction_id = original.id;
  execute 'reset role';
  select * into edited from public.transactions where id = original.id;
  if (response->>'conflict')::boolean or edited.note <> '正确备注' or edited.note_revision <> 1
    or edited.user_note <> '正确备注' then raise exception 'Note update failed'; end if;
  if (to_jsonb(edited) - array['note', 'user_note', 'note_revision']) is distinct from
    (to_jsonb(original) - array['note', 'user_note', 'note_revision']) then
    raise exception 'Note edit mutated ledger facts or original receipt';
  end if;
  if public.get_account_balance(source_id) <> balance_before then raise exception 'Note edit changed balance'; end if;
  if not exists (select 1 from public.transaction_note_edits where transaction_id = original.id
    and old_note = '原备注' and new_note = '正确备注' and updated_by = parent_id and updated_by_name = '备注测试家长')
    then raise exception 'Missing note audit'; end if;

  replay := public.apply_transaction(source_id, 'deposit', 100, '原备注', parent_id, request_id);
  if replay.id <> original.id or replay.note <> '正确备注' then raise exception 'Note edit broke receipt replay'; end if;
  response := public.update_transaction_note(original.id, '覆盖他人修改', 0, parent_id);
  if not (response->>'conflict')::boolean or response->'transactions'->0->>'note' <> '正确备注'
    then raise exception 'Stale editor did not receive current note'; end if;
  perform public.update_transaction_note(original.id, '正确备注', 1, parent_id);
  if (select count(*) from public.transaction_note_edits where transaction_id = original.id) <> 1
    then raise exception 'No-op or conflict created an audit'; end if;
  perform public.update_transaction_note(original.id, '', 1, parent_id);
  select * into edited from public.transactions where id = original.id;
  if edited.note is not null or edited.user_note is not null then raise exception 'Clearing note failed'; end if;
  -- ABA edits must still conflict, even when the text returns to its initial value.
  perform public.update_transaction_note(original.id, '原备注', 2, parent_id);
  response := public.update_transaction_note(original.id, '旧草稿', 0, parent_id);
  if not (response->>'conflict')::boolean then raise exception 'Revision failed to catch ABA edit'; end if;

  perform public.transfer_between_accounts(source_id, target_id, 10, '旧备注 - 保留后半段', parent_id, transfer_request_id);
  select * into outgoing from public.transactions t where t.request_id = transfer_request_id;
  select * into incoming from public.transactions where transfer_group_id = outgoing.transfer_group_id and type = 'transfer_in';
  original_prefix := outgoing.note_prefix;
  if outgoing.user_note <> '旧备注 - 保留后半段' or incoming.user_note <> outgoing.user_note
    then raise exception 'Transfer note separation lost user text'; end if;
  perform public.update_account_name(target_id, '已改名', parent_id);
  -- Editing the incoming side preserves the historical system prefix on both sides.
  perform public.update_transaction_note(incoming.id, '新备注 - 后半段', 0, parent_id);
  if (select count(*) from public.transactions where transfer_group_id = outgoing.transfer_group_id
    and user_note = '新备注 - 后半段' and note_revision = 1) <> 2
    then raise exception 'Transfer pair was not edited atomically'; end if;
  if (select note_prefix from public.transactions where id = outgoing.id) <> original_prefix
    or (select note from public.transactions where id = outgoing.id) <> original_prefix || ' - 新备注 - 后半段'
    then raise exception 'Transfer edit rewrote system prefix'; end if;
  if (select count(*) from public.transaction_note_edits where transaction_id in (outgoing.id, incoming.id)) <> 2
    then raise exception 'Transfer audit missing on one side'; end if;
  response := public.update_transaction_note(outgoing.id, '过时的另一侧', 0, parent_id);
  if not (response->>'conflict')::boolean then raise exception 'Other transfer side did not conflict'; end if;
  perform public.update_transaction_note(outgoing.id, ' ', 1, parent_id);
  if (select count(*) from public.transactions where transfer_group_id = outgoing.transfer_group_id
    and user_note is null and note = note_prefix || ' （无备注）') <> 2
    then raise exception 'Clearing transfer note failed'; end if;
  if public.get_account_balance(source_id) <> 90 or public.get_account_balance(target_id) <> 10
    then raise exception 'Transfer note edits changed money'; end if;
  if (select count(*) from public.transfer_between_accounts(source_id, target_id, 10,
    '旧备注 - 保留后半段', parent_id, transfer_request_id)) <> 2 then raise exception 'Transfer receipt replay failed'; end if;

  rejected := false;
  begin perform public.update_transaction_note(original.id, 'child', 3, child_id);
    exception when others then if sqlerrm like 'Only an active parent%' then rejected := true; else raise; end if; end;
  if not rejected then raise exception 'Child edited a note'; end if;
  update public.app_users set is_active = false where id = parent_id;
  rejected := false;
  begin perform public.update_transaction_note(original.id, 'archived parent', 3, parent_id);
    exception when others then if sqlerrm like 'Only an active parent%' then rejected := true; else raise; end if; end;
  if not rejected then raise exception 'Inactive parent edited a note'; end if;
  update public.app_users set is_active = true where id = parent_id;

  perform public.void_transaction(incoming.id, parent_id);
  rejected := false;
  begin perform public.update_transaction_note(outgoing.id, 'voided', 2, parent_id);
    exception when others then if sqlerrm like 'Cannot edit notes%' then rejected := true; else raise; end if; end;
  if not rejected then raise exception 'Voided transaction edited'; end if;
  insert into public.transactions (account_id, type, amount, currency, note, created_by)
    values (source_id, 'interest', 1, 'CNY', '系统利息', parent_id) returning * into edited;
  rejected := false;
  begin perform public.update_transaction_note(edited.id, 'interest', 0, parent_id);
    exception when others then if sqlerrm like 'Cannot edit notes%' then rejected := true; else raise; end if; end;
  if not rejected then raise exception 'System interest edited'; end if;

  -- Ambiguous legacy transfer names must not be guessed or silently overwritten.
  update public.transactions set note_prefix = null, is_void = false where transfer_group_id = outgoing.transfer_group_id;
  rejected := false;
  begin perform public.update_transaction_note(incoming.id, 'legacy', 2, parent_id);
    exception when others then if sqlerrm like 'Legacy transfer note%' then rejected := true; else raise; end if; end;
  if not rejected then raise exception 'Unrecognized legacy note overwritten'; end if;

  raise exception 'TRANSACTION_NOTE_TESTS_PASSED';
end;
$test$;
