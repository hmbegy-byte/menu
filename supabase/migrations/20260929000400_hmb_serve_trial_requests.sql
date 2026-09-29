-- HMB Serve public trial requests. Additive and intentionally does not create accounts.

create table if not exists public.trial_requests (
  id uuid primary key default gen_random_uuid(),
  contact_name text not null check (char_length(contact_name) between 2 and 100),
  business_name text not null check (char_length(business_name) between 2 and 140),
  phone text not null check (char_length(phone) between 8 and 24),
  business_type text not null check (business_type in ('restaurant','cafe','bakery','food_truck','other')),
  branch_count integer not null check (branch_count between 1 and 100),
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'new' check (status in ('new','following_up','provisioned','closed')),
  request_key uuid not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trial_requests enable row level security;
revoke all on public.trial_requests from anon, authenticated;
grant select,update on public.trial_requests to authenticated;
grant all on public.trial_requests to service_role;

create policy "platform owner reads trial requests" on public.trial_requests
  for select to authenticated using (public.is_platform_admin());
create policy "platform owner updates trial requests" on public.trial_requests
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create or replace function public.submit_trial_request(
  p_contact_name text,p_business_name text,p_phone text,p_business_type text,
  p_branch_count integer,p_notes text,p_request_key uuid,p_website text default null
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare normalized_phone text; saved_id uuid;
begin
  -- Honeypot: bots that fill the hidden website field receive no stored request.
  if coalesce(trim(p_website),'')<>'' then raise exception 'Invalid request'; end if;
  if p_request_key is null or char_length(trim(p_contact_name)) not between 2 and 100
     or char_length(trim(p_business_name)) not between 2 and 140
     or p_business_type not in ('restaurant','cafe','bakery','food_truck','other')
     or p_branch_count not between 1 and 100 or char_length(coalesce(p_notes,''))>1000 then
    raise exception 'Invalid request';
  end if;
  normalized_phone:=regexp_replace(coalesce(p_phone,''),'[^0-9+]','','g');
  if char_length(normalized_phone) not between 8 and 16 then raise exception 'Invalid request'; end if;
  select id into saved_id from public.trial_requests where request_key=p_request_key;
  if saved_id is not null then return saved_id; end if;
  if exists(select 1 from public.trial_requests where phone=normalized_phone and created_at>now()-interval '15 minutes') then
    raise exception 'Please wait before sending another request';
  end if;
  insert into public.trial_requests(contact_name,business_name,phone,business_type,branch_count,notes,request_key)
  values(trim(p_contact_name),trim(p_business_name),normalized_phone,p_business_type,p_branch_count,nullif(trim(p_notes),''),p_request_key)
  returning id into saved_id;
  return saved_id;
end $$;
revoke all on function public.submit_trial_request(text,text,text,text,integer,text,uuid,text) from public;
grant execute on function public.submit_trial_request(text,text,text,text,integer,text,uuid,text) to anon,authenticated,service_role;

create or replace function public.update_trial_request_status(p_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
declare before_status text;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if p_status not in ('new','following_up','provisioned','closed') then raise exception 'Invalid status'; end if;
  select status into before_status from public.trial_requests where id=p_id for update;
  if not found then raise exception 'Request not found'; end if;
  update public.trial_requests set status=p_status,updated_at=now() where id=p_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,changes)
  values(auth.uid(),'status','trial_request',p_id::text,jsonb_build_object('before',before_status,'after',p_status));
  return true;
end $$;
revoke all on function public.update_trial_request_status(uuid,text) from public;
grant execute on function public.update_trial_request_status(uuid,text) to authenticated,service_role;

-- Keep existing configured identity. Only establish the requested product defaults when absent.
insert into public.brand_assets(
  is_platform_default,brand_name,legal_name,theme_color,meta_title,meta_description,pwa_short_name
) select true,'HMB Serve','HMB Digital Solutions','#2563EB','HMB Serve — منصة إدارة المطاعم والمقاهي',
  'منيو وطلبات وولاء العملاء وإدارة المطعم في مكان واحد.','HMB Serve'
where not exists(select 1 from public.brand_assets where is_platform_default=true);

-- Activate the supplied HMB identity while retaining existing support contacts.
update public.brand_assets
set brand_name='HMB Serve',
    legal_name='HMB Digital Solutions',
    logo_url='/hmb-logo-mark.png',
    theme_color='#0B1F3B',
    meta_title='HMB Serve — تشغيل مطعمك من مكان واحد',
    meta_description='منصة عربية لإدارة الطلبات والمطبخ والمنيو والولاء للمطاعم.',
    pwa_short_name='HMB Serve',
    updated_at=now()
where is_platform_default=true;
