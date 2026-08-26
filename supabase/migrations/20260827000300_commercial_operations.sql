-- Commercial operations: delivery, tracking, customer insights, billing and paid add-ons.
alter table public.plans add column if not exists monthly_price numeric(12,2) not null default 0;
update public.plans set monthly_price=case code when 'starter' then 99 when 'growth' then 199 when 'pro' then 399 else monthly_price end;
alter table public.orders drop constraint if exists orders_order_type_check;
alter table public.orders add constraint orders_order_type_check check(order_type in ('pickup','delivery','dine_in'));
alter table public.orders add column if not exists delivery_zone text;
alter table public.orders add column if not exists delivery_fee numeric(12,2) not null default 0 check(delivery_fee >= 0);
alter table public.orders add column if not exists table_number text;
alter table public.orders add column if not exists tracking_token uuid not null default gen_random_uuid();
alter table public.orders add column if not exists promised_at timestamptz;
alter table public.orders add column if not exists accepted_at timestamptz;
alter table public.orders add column if not exists ready_at timestamptz;
alter table public.orders add column if not exists completed_at timestamptz;
alter table public.orders add column if not exists delayed_minutes integer not null default 0 check(delayed_minutes >= 0);
create unique index if not exists orders_tracking_token_idx on public.orders(tracking_token);

create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone text not null,
  name text not null,
  orders_count integer not null default 0,
  total_spent numeric(12,2) not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, phone)
);
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  number text not null unique,
  amount numeric(12,2) not null check(amount >= 0),
  currency text not null default 'SAR',
  status text not null default 'open' check(status in ('draft','open','paid','void','overdue')),
  issued_at date not null default current_date,
  due_at date,
  paid_at timestamptz,
  provider_reference text,
  created_at timestamptz not null default now()
);
create table if not exists public.subscription_addons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  price numeric(12,2) not null default 0 check(price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

alter table public.customer_profiles enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.subscription_addons enable row level security;
create policy "members read customers" on public.customer_profiles for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy "admins manage customers" on public.customer_profiles for all using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "members read invoices" on public.billing_invoices for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy "platform manages invoices" on public.billing_invoices for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "members read subscription addons" on public.subscription_addons for select using (public.is_org_member(organization_id) or public.is_platform_admin());
create policy "admins manage subscription addons" on public.subscription_addons for all using (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin()) with check (public.is_org_member(organization_id,array['owner','admin']) or public.is_platform_admin());

create or replace function public.create_order_v2(
  p_store_id uuid, p_customer_name text, p_customer_phone text, p_order_type text,
  p_delivery_address text, p_notes text, p_payment_method text, p_items jsonb,
  p_delivery_zone_id text default null, p_table_number text default null
) returns table(id uuid, order_number bigint, total_amount numeric, tracking_token uuid, promised_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_store public.stores; v_order_id uuid; v_subtotal numeric:=0; v_tax numeric:=0; v_delivery_fee numeric:=0;
  v_item jsonb; v_product public.products; v_extra numeric:=0; v_qty integer; v_zone jsonb; v_eta integer:=20;
  v_day jsonb; v_now_minutes integer; v_from integer; v_to integer;
begin
  select * into v_store from public.stores where stores.id=p_store_id and is_active for share;
  if not found or coalesce((v_store.settings->>'acceptingOrders')::boolean,true)=false then raise exception 'المطعم لا يستقبل طلبات حاليًا'; end if;
  if jsonb_array_length(coalesce(v_store.working_hours,'[]'::jsonb))>0 then
    select value into v_day from jsonb_array_elements(v_store.working_hours) where (value->>'id')::integer=extract(dow from now() at time zone v_store.timezone)::integer limit 1;
    if v_day is null or coalesce((v_day->>'isOpen')::boolean,false)=false then raise exception 'المطعم مغلق حاليًا'; end if;
    v_now_minutes:=extract(hour from now() at time zone v_store.timezone)::integer*60+extract(minute from now() at time zone v_store.timezone)::integer;
    v_from:=split_part(v_day->>'from',':',1)::integer*60+split_part(v_day->>'from',':',2)::integer;
    v_to:=split_part(v_day->>'to',':',1)::integer*60+split_part(v_day->>'to',':',2)::integer;
    if (v_from<=v_to and not(v_now_minutes between v_from and v_to)) or (v_from>v_to and not(v_now_minutes>=v_from or v_now_minutes<=v_to)) then raise exception 'المطعم مغلق حاليًا'; end if;
  end if;
  if p_order_type not in ('pickup','delivery','dine_in') then raise exception 'نوع الطلب غير صحيح'; end if;
  if p_order_type='delivery' then
    if not exists(select 1 from public.subscriptions sub join public.plans p on p.id=sub.plan_id where sub.organization_id=v_store.organization_id and sub.status in ('trial','active') and p.features ? 'delivery') then raise exception 'التوصيل غير متاح في الباقة الحالية'; end if;
    if coalesce((v_store.settings->>'deliveryEnabled')::boolean,true)=false or nullif(trim(p_delivery_address),'') is null then raise exception 'التوصيل غير متاح أو العنوان ناقص'; end if;
    select value into v_zone from jsonb_array_elements(coalesce(v_store.settings->'deliveryZones','[]'::jsonb)) where value->>'id'=p_delivery_zone_id and coalesce((value->>'active')::boolean,true) limit 1;
    if jsonb_array_length(coalesce(v_store.settings->'deliveryZones','[]'::jsonb))>0 and v_zone is null then raise exception 'منطقة التوصيل غير متاحة'; end if;
    v_delivery_fee:=coalesce((v_zone->>'fee')::numeric,0); v_eta:=coalesce((v_zone->>'etaMinutes')::integer,40);
  elsif p_order_type='dine_in' then
    if coalesce((v_store.settings->>'dineInEnabled')::boolean,true)=false or nullif(trim(p_table_number),'') is null then raise exception 'رقم الطاولة مطلوب'; end if;
    v_eta:=coalesce((v_store.settings->>'pickupEtaMinutes')::integer,20);
  else v_eta:=coalesce((v_store.settings->>'pickupEtaMinutes')::integer,20);
  end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'السلة فارغة'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(100,coalesce((v_item->>'quantity')::integer,1)));
    select * into v_product from public.products where products.id=(v_item->>'product_id')::uuid and store_id=p_store_id and is_available;
    if not found then raise exception 'أحد الأصناف غير متاح'; end if;
    select coalesce(sum(coalesce(nullif(choice->>'extra_price','')::numeric,nullif(choice->>'price','')::numeric,0)),0) into v_extra
      from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) grp, jsonb_array_elements(coalesce(grp->'choices','[]'::jsonb)) choice
      where coalesce(choice->>'name',choice->>'label') in (select opt->>'name' from jsonb_array_elements(coalesce(v_item->'selected_options','[]'::jsonb)) opt);
    v_subtotal:=v_subtotal+((v_product.price+v_extra)*v_qty);
  end loop;
  if v_subtotal < greatest(coalesce((v_store.settings->>'minOrderValue')::numeric,0),coalesce((v_zone->>'minOrder')::numeric,0)) then raise exception 'الطلب أقل من الحد الأدنى'; end if;
  v_tax:=round(v_subtotal*coalesce((v_store.settings->>'taxPercent')::numeric,0)/100,2);
  insert into public.orders(store_id,customer_name,customer_phone,order_type,delivery_address,delivery_zone,delivery_fee,table_number,notes,payment_method,subtotal_amount,tax_amount,total_amount,promised_at)
  values(p_store_id,trim(p_customer_name),trim(p_customer_phone),p_order_type,nullif(trim(p_delivery_address),''),v_zone->>'name',v_delivery_fee,nullif(trim(p_table_number),''),nullif(trim(p_notes),''),p_payment_method,v_subtotal,v_tax,v_subtotal+v_tax+v_delivery_fee,now()+make_interval(mins=>v_eta)) returning orders.id into v_order_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty:=greatest(1,least(100,coalesce((v_item->>'quantity')::integer,1)));
    select * into v_product from public.products where products.id=(v_item->>'product_id')::uuid;
    select coalesce(sum(coalesce(nullif(choice->>'extra_price','')::numeric,nullif(choice->>'price','')::numeric,0)),0) into v_extra
      from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) grp, jsonb_array_elements(coalesce(grp->'choices','[]'::jsonb)) choice
      where coalesce(choice->>'name',choice->>'label') in (select opt->>'name' from jsonb_array_elements(coalesce(v_item->'selected_options','[]'::jsonb)) opt);
    insert into public.order_items(order_id,product_id,product_name,unit_price,quantity,selected_options) values(v_order_id,v_product.id,v_product.name,v_product.price+v_extra,v_qty,coalesce(v_item->'selected_options','[]'::jsonb));
  end loop;
  return query select o.id,o.order_number,o.total_amount,o.tracking_token,o.promised_at from public.orders o where o.id=v_order_id;
end $$;
grant execute on function public.create_order_v2(uuid,text,text,text,text,text,text,jsonb,text,text) to anon, authenticated;

create or replace function public.track_order(p_tracking_token uuid)
returns table(order_number bigint,status text,order_type text,delivery_zone text,table_number text,total_amount numeric,promised_at timestamptz,delayed_minutes integer,store_slug text,currency text)
language sql stable security definer set search_path=public as $$
  select o.order_number,o.status,o.order_type,o.delivery_zone,o.table_number,o.total_amount,o.promised_at,o.delayed_minutes,s.slug,s.currency
  from public.orders o join public.stores s on s.id=o.store_id where o.tracking_token=p_tracking_token limit 1;
$$;
grant execute on function public.track_order(uuid) to anon, authenticated;

create or replace function public.sync_customer_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.stores where id=new.store_id;
  if v_org is not null then
    insert into public.customer_profiles(organization_id,phone,name,orders_count,total_spent,last_order_at)
    values(v_org,regexp_replace(new.customer_phone,'\s','','g'),new.customer_name,1,case when new.status='cancelled' then 0 else new.total_amount end,new.created_at)
    on conflict(organization_id,phone) do update set name=excluded.name,orders_count=public.customer_profiles.orders_count+1,total_spent=public.customer_profiles.total_spent+excluded.total_spent,last_order_at=greatest(public.customer_profiles.last_order_at,excluded.last_order_at),updated_at=now();
  end if;
  return new;
end $$;
drop trigger if exists orders_sync_customer on public.orders;
create trigger orders_sync_customer after insert on public.orders for each row execute function public.sync_customer_profile();
