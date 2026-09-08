-- Google accounts do not prove phone ownership. Preserve existing phone balances.
alter table public.loyalty_customers alter column phone drop not null;
alter table public.loyalty_customers add column if not exists joined_at timestamptz;
alter table public.loyalty_customers add column if not exists consent_version text;
alter table public.loyalty_customers add column if not exists contact_phone text;
create or replace function public.join_loyalty_program(p_store_id uuid, p_consent boolean, p_phone text, p_name text)
returns public.loyalty_customers
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_user uuid := auth.uid();
  v_name text;
  v_phone text;
  v_customer public.loyalty_customers;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_consent is distinct from true then raise exception 'Consent required'; end if;
  v_phone := regexp_replace(translate(coalesce(p_phone,''),'٠١٢٣٤٥٦٧٨٩','0123456789'),'[\s()-]','','g');
  if v_phone ~ '^05[0-9]{8}$' then v_phone := '+966' || substr(v_phone,2); end if;
  if v_phone ~ '^9665[0-9]{8}$' then v_phone := '+' || v_phone; end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone number'; end if;
  v_name := trim(coalesce(p_name,''));
  if length(v_name) < 2 or length(v_name)>100 then raise exception 'Invalid name'; end if;
  if not exists(select 1 from auth.identities where user_id=v_user and provider='google') then
    raise exception 'Google identity required';
  end if;
  select s.organization_id into v_org from public.stores s
    join public.loyalty_programs p on p.organization_id=s.organization_id and p.is_active
    where s.id=p_store_id and s.is_active;
  if v_org is null then raise exception 'Program unavailable'; end if;
  insert into public.loyalty_customers(organization_id,auth_user_id,name,contact_phone,joined_at,consent_version)
    values(v_org,v_user,v_name,v_phone,now(),'loyalty-v1')
    on conflict(organization_id,auth_user_id) do update
    set joined_at=coalesce(loyalty_customers.joined_at,excluded.joined_at),
        consent_version=coalesce(loyalty_customers.consent_version,excluded.consent_version)
    returning * into v_customer;
  return v_customer;
end $$;
revoke all on function public.join_loyalty_program(uuid,boolean,text,text) from public,anon;
grant execute on function public.join_loyalty_program(uuid,boolean,text,text) to authenticated;
