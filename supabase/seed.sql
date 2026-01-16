with parents as (
  insert into app_users (name, role, pin, avatar_id)
  values
    ('爸爸', 'parent', '1234', 'parent-1'),
    ('妈妈', 'parent', '2345', 'parent-2')
  returning id, name
),
children as (
  insert into app_users (name, role, pin, avatar_id)
  values
    ('大女儿', 'child', '1111', 'child-2'),
    ('小女儿', 'child', '2222', 'child-3')
  returning id, name
),
settings_row as (
  insert into settings (id, annual_rate, timezone)
  values ('00000000-0000-0000-0000-000000000001', 10.00, 'Asia/Singapore')
  on conflict (id) do update
  set annual_rate = excluded.annual_rate,
      timezone = excluded.timezone,
      updated_at = now()
  returning id
)
insert into accounts (name, currency, owner_child_id, created_by)
values
  (
    '中国 - 日常',
    'CNY',
    (select id from children where name = '大女儿'),
    (select id from parents where name = '爸爸')
  ),
  (
    '中国 - 目标基金',
    'CNY',
    (select id from children where name = '大女儿'),
    (select id from parents where name = '爸爸')
  ),
  (
    '中国 - 日常',
    'CNY',
    (select id from children where name = '小女儿'),
    (select id from parents where name = '妈妈')
  );
