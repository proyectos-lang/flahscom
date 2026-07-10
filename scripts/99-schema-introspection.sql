-- ============================================================================
-- Schema introspection script
-- Run this in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Copy the full result (or "Download as CSV" per query) and share it back
-- so it can be turned into docs/DATABASE_SCHEMA.md.
-- ============================================================================

-- 1) Tables and columns (types, nullability, defaults)
select
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default,
  c.character_maximum_length
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema and t.table_name = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
order by c.table_name, c.ordinal_position;

-- 2) Primary keys
select
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
where tc.constraint_type = 'PRIMARY KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.ordinal_position;

-- 3) Foreign keys (relationships between tables)
select
  tc.table_name as source_table,
  kcu.column_name as source_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  tc.constraint_name,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name;

-- 4) Unique constraints
select
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
where tc.constraint_type = 'UNIQUE'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.ordinal_position;

-- 5) Check constraints (e.g. enum-like "estatus in (...)" checks)
select
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
from information_schema.table_constraints tc
join information_schema.check_constraints cc
  on tc.constraint_name = cc.constraint_name and tc.table_schema = cc.constraint_schema
where tc.constraint_type = 'CHECK'
  and tc.table_schema = 'public'
order by tc.table_name;

-- 6) Indexes
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- 7) Row Level Security status per table
select
  schemaname,
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
order by tablename;

-- 8) RLS policies (if any)
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 9) Row counts per table (quick sanity check on data volume)
select
  relname as table_name,
  n_live_tup as approx_row_count
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc;

-- ============================================================================
-- Optional: single JSON blob with everything above, handy to paste in one go.
-- ============================================================================
select json_build_object(
  'tables', (
    select json_agg(json_build_object(
      'table_name', c.table_name,
      'columns', (
        select json_agg(json_build_object(
          'column_name', c2.column_name,
          'data_type', c2.data_type,
          'is_nullable', c2.is_nullable,
          'column_default', c2.column_default
        ) order by c2.ordinal_position)
        from information_schema.columns c2
        where c2.table_schema = 'public' and c2.table_name = c.table_name
      )
    ))
    from (select distinct table_name from information_schema.columns where table_schema = 'public') c
  ),
  'foreign_keys', (
    select json_agg(json_build_object(
      'source_table', tc.table_name,
      'source_column', kcu.column_name,
      'referenced_table', ccu.table_name,
      'referenced_column', ccu.column_name
    ))
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
  ),
  'rls_policies', (
    select json_agg(json_build_object(
      'table_name', tablename,
      'policy_name', policyname,
      'cmd', cmd,
      'roles', roles
    ))
    from pg_policies
    where schemaname = 'public'
  )
) as schema_json;
