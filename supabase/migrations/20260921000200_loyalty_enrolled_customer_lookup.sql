-- Legacy order flows could leave an unconsented phone-only row beside the
-- customer's Google-enrolled membership. Staff phone lookup must only return
-- memberships that were explicitly joined, otherwise one phone appears twice.
create or replace function public.staff_loyalty_lookup(
  p_store_id uuid,
  p_phone text default null,
  p_customer_id uuid default null,
  p_token text default null
)
returns table(
  id uuid,
  name text,
  membership_number text,
  contact_phone text,
  points_balance integer,
  stamps_balance integer
)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare
  v_org uuid;
  v_phone_key text;
begin
  if auth.uid() is null or not exists(
    select 1 from public.store_members
    where store_id=p_store_id and user_id=auth.uid()
      and role in ('admin','kitchen','manager','cashier')
  ) then
    raise exception 'Not authorized';
  end if;

  select organization_id into v_org from public.stores where stores.id=p_store_id;
  if v_org is null then raise exception 'Store unavailable'; end if;

  if p_phone is not null then
    v_phone_key := public.loyalty_phone_key(p_phone);
    if v_phone_key !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone'; end if;
  end if;

  return query
  select c.id,c.name::text,c.membership_number::text,
         coalesce(c.contact_phone,c.phone)::text,c.points_balance,c.stamps_balance
  from public.loyalty_customers c
  where c.organization_id=v_org and (
    (p_phone is not null and c.joined_at is not null and
      (public.loyalty_phone_key(c.phone)=v_phone_key or
       public.loyalty_phone_key(c.contact_phone)=v_phone_key))
    or
    (p_phone is null and c.id=p_customer_id and c.qr_token=p_token)
  )
  limit 2;
end $$;

revoke all on function public.staff_loyalty_lookup(uuid,text,uuid,text) from public,anon;
grant execute on function public.staff_loyalty_lookup(uuid,text,uuid,text) to authenticated;
