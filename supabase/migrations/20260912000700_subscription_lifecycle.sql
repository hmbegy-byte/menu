create table public.subscription_collections (
 id uuid primary key, organization_id uuid not null references public.organizations(id),
 operator_id uuid not null references auth.users(id), reference text not null unique,
 amount numeric(12,2) not null check(amount>=0), currency text not null check(currency='SAR'),
 period_days integer not null check(period_days between 1 and 366),
 period_start date not null, period_end date not null, created_at timestamptz not null default now()
);
alter table public.subscription_collections enable row level security;
create policy "platform reads collections" on public.subscription_collections for select to authenticated using(public.is_platform_admin());
revoke insert,update,delete on public.subscription_collections from anon,authenticated;
create or replace function public.subscription_current(p_org uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.subscriptions where organization_id=p_org and status in ('active','trial')
 and current_period_start<=current_date and current_period_end is not null and current_period_end>current_date);
$$;
create or replace function public.confirm_subscription_collection(p_org uuid,p_request uuid,p_reference text,p_amount numeric,p_days integer)
returns date language plpgsql security definer set search_path=public,pg_temp as $$
declare sub public.subscriptions; prev public.subscription_collections; start_day date; end_day date;
begin
 if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
 if p_request is null or nullif(trim(p_reference),'') is null or p_amount is null or p_amount<0 or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount<>round(p_amount,2) or p_days is null or p_days not between 1 and 366 then raise exception 'Invalid collection'; end if;
 select * into sub from public.subscriptions where organization_id=p_org for update;
 if not found then raise exception 'Subscription missing'; end if;
 select * into prev from public.subscription_collections where id=p_request or reference=trim(p_reference);
 if found then
   if prev.organization_id<>p_org or prev.amount<>p_amount or prev.period_days<>p_days or prev.reference<>trim(p_reference) then raise exception 'Collection conflict'; end if;
   return prev.period_end;
 end if;
 -- Fixed-day periods; paid time is preserved. Trial time is not paid time.
 start_day:=case when sub.status in ('active','paused') then greatest(current_date,coalesce(sub.current_period_end,current_date)) else current_date end;
 end_day:=start_day+p_days;
 insert into public.subscription_collections(id,organization_id,operator_id,reference,amount,currency,period_days,period_start,period_end)
 values(p_request,p_org,auth.uid(),trim(p_reference),p_amount,'SAR',p_days,start_day,end_day);
 update public.subscriptions set status='active',current_period_start=case when sub.status in ('active','paused') and sub.current_period_end>current_date then sub.current_period_start else current_date end,current_period_end=end_day where id=sub.id;
 return end_day;
end $$;
revoke all on function public.confirm_subscription_collection(uuid,uuid,text,numeric,integer) from public,anon;
grant execute on function public.confirm_subscription_collection(uuid,uuid,text,numeric,integer) to authenticated;
create or replace function public.set_subscription_suspension(p_org uuid,p_paused boolean) returns void
language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
 if p_paused is null then raise exception 'Suspension state required'; end if;
 if not p_paused and not exists(select 1 from public.subscriptions where organization_id=p_org and current_period_end>current_date) then raise exception 'Renew expired subscription before reactivation'; end if;
 update public.subscriptions set status=case when p_paused then 'paused' else 'active' end where organization_id=p_org;
 insert into public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,changes) values(p_org,auth.uid(),case when p_paused then 'suspend' else 'reactivate' end,'subscription',p_org::text,jsonb_build_object('paused',p_paused));
end $$;
revoke all on function public.set_subscription_suspension(uuid,boolean) from public,anon;
grant execute on function public.set_subscription_suspension(uuid,boolean) to authenticated;

create or replace function public.store_has_feature(p_store uuid,p_feature text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.stores s join public.subscriptions sub on sub.organization_id=s.organization_id join public.plans p on p.id=sub.plan_id
 where s.id=p_store and public.subscription_current(s.organization_id) and p.features ? p_feature);
$$;
create or replace function public.enforce_subscription_on_order() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin
 if not public.store_has_feature(new.store_id,'orders') then raise exception 'اشتراك المطعم منتهٍ أو غير نشط أو لا يشمل الطلبات'; end if;
 return new;
end $$;
do $$ declare d text; begin
 d:=pg_get_functiondef('public.check_kitchen_access(uuid)'::regprocedure);
 d:=replace(d,'return ''ALLOWED'';', 'if not public.store_has_feature(p_store_id,''kitchen'') then return ''SUBSCRIPTION_INACTIVE''; end if; return ''ALLOWED'';');
 execute d;
end $$;

create or replace function public.onboard_restaurant(p_name text,p_slug text,p_email text,p_plan text,p_phone text,p_request uuid,p_legal_name text,p_branch_name text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid; plan uuid;
begin
 if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
 if p_request is null or p_name is null or length(trim(p_name))<2 or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'Invalid restaurant'; end if;
 perform pg_advisory_xact_lock(hashtext(p_request::text));
 select id into org from public.organizations where metadata->>'onboarding_request'=p_request::text;
 if found then
   if not exists(select 1 from public.stores where organization_id=org and slug=p_slug and name=trim(p_name)) then raise exception 'Onboarding request conflict'; end if;
   return org;
 end if;
 select id into plan from public.plans where code=p_plan and is_active;
 if not found then raise exception 'Plan unavailable'; end if;
 insert into public.organizations(name,legal_name,owner_email,status,metadata) values(trim(p_name),p_legal_name,p_email,'trial',jsonb_build_object('onboarding_request',p_request,'setup_pending',true)) returning id into org;
 insert into public.subscriptions(organization_id,plan_id,status,current_period_start,current_period_end) values(org,plan,'trial',current_date,current_date+14);
 insert into public.stores(organization_id,name,branch_name,slug,phone_whatsapp,currency) values(org,trim(p_name),p_branch_name,p_slug,p_phone,'SAR');
 return org;
end $$;
revoke all on function public.onboard_restaurant(text,text,text,text,text,uuid,text,text) from public,anon;
grant execute on function public.onboard_restaurant(text,text,text,text,text,uuid,text,text) to authenticated;
