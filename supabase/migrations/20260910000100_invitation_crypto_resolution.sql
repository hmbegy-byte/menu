-- Supabase may install pgcrypto outside public. Resolve its trusted schema
-- explicitly for both token creation and token acceptance.
do $$
declare crypto_schema text; target regprocedure; probe text;
begin
 select n.nspname into crypto_schema
 from pg_extension e join pg_namespace n on n.oid=e.extnamespace
 where e.extname='pgcrypto';
 if crypto_schema is null then raise exception 'pgcrypto is required for staff invitations'; end if;
 execute format('select encode(%I.digest(%I.gen_random_bytes(32),''sha256''),''hex'')',crypto_schema,crypto_schema) into probe;
 if length(probe)<>64 then raise exception 'Invitation token generation failed'; end if;
 foreach target in array array[
   'public.create_staff_invitation(uuid,text,text)'::regprocedure,
   'public.accept_staff_invitation(text)'::regprocedure
 ] loop
   execute format('alter function %s set search_path = public, %I, pg_temp',target,crypto_schema);
 end loop;
end $$;
