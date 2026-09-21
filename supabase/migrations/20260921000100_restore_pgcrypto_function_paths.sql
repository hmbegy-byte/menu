-- pgcrypto is installed in a dedicated schema on hosted Supabase projects.
-- Functions with a hardened search_path must explicitly include that trusted
-- schema or unqualified digest() calls fail at runtime with PostgreSQL 42883.
do $$
declare
  crypto_schema text;
begin
  select n.nspname into crypto_schema
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if crypto_schema is null then
    raise exception 'pgcrypto is required for order checkout and staff invitations';
  end if;

  execute format(
    'alter function public.create_order_v5(uuid,text,text,text,text,text,text,jsonb,text,text,uuid,numeric,numeric,text,text,text,text) set search_path = public, %I, pg_temp',
    crypto_schema
  );
  execute format(
    'alter function public.accept_staff_invitation(text) set search_path = public, %I, pg_temp',
    crypto_schema
  );
end $$;
