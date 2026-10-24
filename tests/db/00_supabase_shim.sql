-- TEST ONLY. Reproduces the parts of a Supabase database the migrations rely on:
-- roles, the auth schema with auth.uid(), and Supabase's default grants.
\ir 00_supabase_roles.sql

create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
