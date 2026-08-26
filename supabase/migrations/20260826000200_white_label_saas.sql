-- White-label, multi-tenant foundation. A store represents one branch/storefront.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  owner_email text,
  status text not null default 'active' check (status in ('trial','active','past_due','suspended','cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','accountant')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.plans(code,name,description,features,limits,sort_order) values
('starter','البداية','القائمة الرقمية والطلبات الأساسية','["digital_menu","qr","orders","whatsapp","basic_reports"]','{"branches":1,"staff":3,"products":100}',10),
('growth','النمو','المطبخ والدفع والتسويق','["digital_menu","qr","orders","whatsapp","basic_reports","kitchen","online_payment","delivery","coupons","advanced_reports"]','{"branches":2,"staff":10,"products":500}',20),
('pro','الاحترافية','تعدد الفروع والهوية المستقلة','["digital_menu","qr","orders","whatsapp","basic_reports","kitchen","online_payment","delivery","coupons","advanced_reports","multi_branch","custom_domain","white_label","loyalty","integrations","custom_roles"]','{"branches":20,"staff":100,"products":5000}',30)
on conflict(code) do update set name=excluded.name,description=excluded.description,features=excluded.features,limits=excluded.limits,sort_order=excluded.sort_order;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status text not null default 'trial' check (status in ('trial','active','past_due','paused','cancelled')),
  current_period_start date not null default current_date,
  current_period_end date,
  provider_customer_id text,
  provider_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stores add column if not exists organization_id uuid references public.organizations(id);
alter table public.stores add column if not exists branch_name text;
alter table public.stores add column if not exists custom_domain text;
alter table public.stores add column if not exists white_label jsonb not null default '{}'::jsonb;
alter table public.stores add column if not exists onboarding jsonb not null default '{}'::jsonb;
create unique index if not exists stores_custom_domain_unique on public.stores(lower(custom_domain)) where custom_domain is not null and custom_domain<>'';

do $$
declare branch record; new_org uuid; starter_plan uuid;
begin
  select id into starter_plan from public.plans where code='starter';
  for branch in select * from public.stores where organization_id is null loop
    insert into public.organizations(name,legal_name,status) values(branch.name,branch.name,'active') returning id into new_org;
    update public.stores set organization_id=new_org,branch_name=coalesce(branch_name,'الفرع الرئيسي') where id=branch.id;
    insert into public.subscriptions(organization_id,plan_id,status) values(new_org,starter_plan,'trial') on conflict(organization_id) do nothing;
    insert into public.organization_members(organization_id,user_id,role)
      select new_org,user_id,'owner' from public.store_members where store_id=branch.id and role='admin'
      on conflict do nothing;
  end loop;
end $$;

create table if not exists public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','manager','cashier','kitchen','accountant')),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  token_hash text,
  expires_at timestamptz not null default now()+interval '7 days',
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique(organization_id,email,store_id,status)
);

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  hostname text not null unique,
  status text not null default 'pending' check (status in ('pending','verified','active','failed')),
  verification_token text not null default encode(gen_random_bytes(18),'hex'),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(store_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.store_members drop constraint if exists store_members_role_check;
alter table public.store_members add constraint store_members_role_check check (role in ('admin','manager','cashier','kitchen','accountant'));

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.platform_admins where user_id=auth.uid());
$$;

create or replace function public.is_org_member(target_org uuid, allowed_roles text[] default array['owner','admin','manager','accountant'])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members where organization_id=target_org and user_id=auth.uid() and role=any(allowed_roles));
$$;

alter table public.organizations enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organization_members enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.custom_domains enable row level security;
alter table public.audit_logs enable row level security;

create policy "platform admins read themselves" on public.platform_admins for select using (user_id=auth.uid());
create policy "platform admins manage organizations" on public.organizations for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "members read organization" on public.organizations for select using (public.is_org_member(id) or public.is_platform_admin());
create policy "owners update organization" on public.organizations for update using (public.is_org_member(id,array['owner','admin']) or public.is_platform_admin());
create policy "public reads active plans" on public.plans for select using (is_active or public.is_platform_admin());
create policy "platform admins manage plans" on public.plans for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "members read organization memberships" on public.organization_members for select using (user_id=auth.uid() or public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());
create policy "owners manage organization memberships" on public.organization_members for all using (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());
create policy "members read subscriptions" on public.subscriptions for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy "platform admins manage subscriptions" on public.subscriptions for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "admins manage invitations" on public.staff_invitations for all using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "admins manage domains" on public.custom_domains for all using (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());
create policy "public resolves verified domains" on public.custom_domains for select using (status in ('verified','active'));
create policy "members read audit logs" on public.audit_logs for select using (public.is_org_member(organization_id,array['owner','admin','manager','accountant']) or public.is_platform_admin());
create policy "platform admins read all stores" on public.stores for select using (public.is_platform_admin());
create policy "platform admins update all stores" on public.stores for update using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "org admins create branches" on public.stores for insert with check (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());
create policy "org admins manage branches" on public.stores for update using (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());
create policy "org owners delete branches" on public.stores for delete using (public.is_org_member(organization_id,array['owner']) or public.is_platform_admin());

create index if not exists stores_organization_idx on public.stores(organization_id);
create index if not exists invitations_organization_idx on public.staff_invitations(organization_id,status);
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id,created_at desc);

create or replace function public.enforce_subscription_on_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare org_id uuid; subscription_status text; plan_features jsonb;
begin
  select s.organization_id,sub.status,p.features into org_id,subscription_status,plan_features
  from public.stores s
  left join public.subscriptions sub on sub.organization_id=s.organization_id
  left join public.plans p on p.id=sub.plan_id
  where s.id=new.store_id;
  if coalesce(subscription_status,'') not in ('trial','active') then
    raise exception 'اشتراك المطعم غير نشط';
  end if;
  if not coalesce(plan_features ? 'orders',false) then
    raise exception 'الطلبات غير متاحة في باقة المطعم';
  end if;
  return new;
end $$;

drop trigger if exists enforce_order_subscription on public.orders;
create trigger enforce_order_subscription before insert on public.orders
for each row execute function public.enforce_subscription_on_order();

create or replace function public.enforce_branch_plan_limit()
returns trigger language plpgsql security definer set search_path=public as $$
declare branch_limit integer; current_count integer;
begin
  if public.is_platform_admin() then return new; end if;
  select coalesce((p.limits->>'branches')::integer,1) into branch_limit
  from public.subscriptions sub join public.plans p on p.id=sub.plan_id
  where sub.organization_id=new.organization_id and sub.status in ('trial','active');
  if branch_limit is null then raise exception 'اشتراك المؤسسة غير نشط'; end if;
  select count(*) into current_count from public.stores where organization_id=new.organization_id;
  if current_count>=branch_limit then raise exception 'وصلت إلى الحد الأقصى للفروع في الباقة'; end if;
  return new;
end $$;

drop trigger if exists enforce_store_branch_limit on public.stores;
create trigger enforce_store_branch_limit before insert on public.stores
for each row execute function public.enforce_branch_plan_limit();

create or replace function public.log_store_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_logs(organization_id,store_id,actor_id,action,entity_type,entity_id,changes)
  values(
    coalesce(new.organization_id,old.organization_id),coalesce(new.id,old.id),auth.uid(),lower(tg_op),
    'store',coalesce(new.id,old.id)::text,
    jsonb_build_object('before',case when tg_op='INSERT' then null else to_jsonb(old) end,'after',case when tg_op='DELETE' then null else to_jsonb(new) end)
  );
  return coalesce(new,old);
end $$;

drop trigger if exists audit_store_changes on public.stores;
create trigger audit_store_changes after insert or update or delete on public.stores
for each row execute function public.log_store_change();
