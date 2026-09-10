-- Exact lookups only: kitchen staff cannot enumerate all loyalty customers.
create or replace function public.staff_loyalty_lookup(p_store_id uuid, p_phone text default null, p_customer_id uuid default null, p_token text default null)
returns table(id uuid, name text, membership_number text, contact_phone text, points_balance integer, stamps_balance integer)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_org uuid;
begin
  if auth.uid() is null or not exists(select 1 from public.store_members where store_id=p_store_id and user_id=auth.uid() and role in ('admin','kitchen','manager','cashier')) then
    raise exception 'Not authorized';
  end if;
  select organization_id into v_org from public.stores where stores.id=p_store_id;
  if p_phone is not null and p_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone'; end if;
  return query select c.id,c.name::text,c.membership_number::text,c.contact_phone::text,c.points_balance,c.stamps_balance
  from public.loyalty_customers c where c.organization_id=v_org and
    ((p_phone is not null and (c.phone=p_phone or c.contact_phone=p_phone)) or
     (p_phone is null and c.id=p_customer_id and c.qr_token=p_token)) limit 2;
end $$;
revoke all on function public.staff_loyalty_lookup(uuid,text,uuid,text) from public,anon;
grant execute on function public.staff_loyalty_lookup(uuid,text,uuid,text) to authenticated;
-- Preserve balance locking, store scope, audit entries and insufficient-balance checks.
do $$ declare definition text; begin
  definition := pg_get_functiondef('public.adjust_loyalty_balance(uuid,uuid,integer,text,text)'::regprocedure);
  if position('role in (''admin'',''manager'',''cashier'')' in definition)=0 then raise exception 'Unexpected loyalty authorization definition'; end if;
  execute replace(definition,'role in (''admin'',''manager'',''cashier'')','role in (''admin'',''manager'',''cashier'',''kitchen'')');
end $$;
