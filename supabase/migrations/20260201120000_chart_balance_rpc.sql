create or replace function get_balance_before_date(
  p_account_id uuid,
  p_before timestamptz
)
returns numeric
language sql
stable
as $$
  select coalesce(
    sum(
      case
        when type in ('withdrawal', 'transfer_out') then -amount
        else amount
      end
    ),
    0
  )
  from transactions
  where account_id = p_account_id
    and created_at < p_before;
$$;
