-- Reliability and payment foundations for production restaurant operations.
alter table public.orders add column if not exists idempotency_key uuid;
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_reference text;
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists refunded_amount numeric(12,2) not null default 0;
alter table public.orders add column if not exists delivery_latitude numeric(10,7);
alter table public.orders add column if not exists delivery_longitude numeric(10,7);
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check(payment_status in ('unpaid','pending','paid','failed','partially_refunded','refunded'));
create unique index if not exists orders_store_idempotency_idx on public.orders(store_id,idempotency_key) where idempotency_key is not null;
create index if not exists orders_store_payment_status_idx on public.orders(store_id,payment_status,created_at desc);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  provider text not null,
  provider_reference text not null,
  kind text not null default 'payment' check(kind in ('payment','refund','void')),
  status text not null check(status in ('initiated','pending','paid','failed','refunded','voided')),
  amount numeric(12,2) not null check(amount >= 0),
  currency text not null,
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_reference,kind)
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_valid boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,provider_event_id)
);

create table if not exists public.system_incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  source text not null,
  severity text not null default 'warning' check(severity in ('info','warning','critical')),
  title text not null,
  details text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.system_incidents enable row level security;
create policy "members read payment transactions" on public.payment_transactions for select using(public.is_org_member(organization_id) or public.is_platform_admin());
create policy "platform manages payment transactions" on public.payment_transactions for all using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "platform reads webhook events" on public.payment_webhook_events for select using(public.is_platform_admin());
create policy "members read incidents" on public.system_incidents for select using(public.is_org_member(organization_id) or public.is_platform_admin());
create policy "admins manage incidents" on public.system_incidents for all using(public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin()) with check(public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());

create or replace function public.report_store_incident(p_store_id uuid,p_source text,p_severity text,p_title text,p_details text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_org uuid;
begin
  if not public.is_store_member(p_store_id,array['admin','manager','kitchen']) and not public.is_platform_admin() then raise exception 'غير مصرح'; end if;
  select organization_id into v_org from public.stores where id=p_store_id;
  if not exists(select 1 from public.system_incidents where store_id=p_store_id and source=p_source and title=p_title and resolved_at is null and created_at>now()-interval '10 minutes') then
    insert into public.system_incidents(organization_id,store_id,source,severity,title,details) values(v_org,p_store_id,p_source,case when p_severity in ('info','warning','critical') then p_severity else 'warning' end,p_title,left(p_details,1000));
  end if;
end $$;
grant execute on function public.report_store_incident(uuid,text,text,text,text) to authenticated;

create or replace function public.log_failed_payment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='failed' and old.status is distinct from new.status then
    insert into public.system_incidents(organization_id,store_id,source,severity,title,details)
    values(new.organization_id,new.store_id,'payments','warning','فشل عملية دفع','المرجع: '||new.provider_reference);
  end if;
  return new;
end $$;
drop trigger if exists payment_failure_incident on public.payment_transactions;
create trigger payment_failure_incident after update on public.payment_transactions for each row execute function public.log_failed_payment();

create or replace function public.enforce_subscription_on_order()
returns trigger language plpgsql security definer set search_path=public as $$
declare subscription_status text; plan_features jsonb; period_end timestamptz;
begin
  select sub.status,p.features,sub.current_period_end into subscription_status,plan_features,period_end
  from public.stores s left join public.subscriptions sub on sub.organization_id=s.organization_id left join public.plans p on p.id=sub.plan_id
  where s.id=new.store_id;
  if coalesce(subscription_status,'') not in ('trial','active') then raise exception 'اشتراك المطعم غير نشط'; end if;
  if period_end is not null and period_end<now() then raise exception 'انتهت صلاحية اشتراك المطعم'; end if;
  if not coalesce(plan_features ? 'orders',false) then raise exception 'الطلبات غير متاحة في باقة المطعم'; end if;
  return new;
end $$;

create or replace function public.enforce_store_capacity()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_store public.stores; v_recent integer; v_limit integer; v_paused_until timestamptz;
begin
  select * into v_store from public.stores where id=new.store_id;
  v_limit:=greatest(1,coalesce((v_store.settings->>'maxOrdersPer15Minutes')::integer,12));
  v_paused_until:=nullif(v_store.settings->>'pausedUntil','')::timestamptz;
  if v_paused_until is not null and v_paused_until>now() then
    raise exception '%',coalesce(nullif(v_store.settings->>'pauseReason',''),'المطعم متوقف مؤقتًا عن استقبال الطلبات');
  end if;
  select count(*) into v_recent from public.orders where store_id=new.store_id and status<>'cancelled' and created_at>=now()-interval '15 minutes';
  if v_recent>=v_limit then raise exception 'المطعم مزدحم حاليًا، حاول مرة أخرى بعد دقائق'; end if;
  return new;
end $$;
drop trigger if exists orders_enforce_capacity on public.orders;
create trigger orders_enforce_capacity before insert on public.orders for each row execute function public.enforce_store_capacity();

create or replace function public.create_order_v3(
  p_store_id uuid, p_customer_name text, p_customer_phone text, p_order_type text,
  p_delivery_address text, p_notes text, p_payment_method text, p_items jsonb,
  p_delivery_zone_id text default null, p_table_number text default null,
  p_idempotency_key uuid default null, p_delivery_latitude numeric default null,
  p_delivery_longitude numeric default null
) returns table(id uuid, order_number bigint, total_amount numeric, tracking_token uuid, promised_at timestamptz, payment_status text)
language plpgsql security definer set search_path=public as $$
declare v_created record; v_existing public.orders;
begin
  if p_idempotency_key is null then raise exception 'معرف محاولة الطلب مطلوب'; end if;
  perform pg_advisory_xact_lock(hashtext(p_store_id::text||p_idempotency_key::text));
  select * into v_existing from public.orders where store_id=p_store_id and idempotency_key=p_idempotency_key limit 1;
  if found then
    return query select v_existing.id,v_existing.order_number,v_existing.total_amount,v_existing.tracking_token,v_existing.promised_at,v_existing.payment_status;
    return;
  end if;
  select * into v_created from public.create_order_v2(p_store_id,p_customer_name,p_customer_phone,p_order_type,p_delivery_address,p_notes,p_payment_method,p_items,p_delivery_zone_id,p_table_number);
  update public.orders set
    idempotency_key=p_idempotency_key,
    delivery_latitude=p_delivery_latitude,
    delivery_longitude=p_delivery_longitude,
    payment_status=case when p_payment_method='cash' then 'unpaid' when p_payment_method='bank_transfer' then 'pending' else 'pending' end
  where orders.id=v_created.id returning * into v_existing;
  return query select v_existing.id,v_existing.order_number,v_existing.total_amount,v_existing.tracking_token,v_existing.promised_at,v_existing.payment_status;
end $$;
grant execute on function public.create_order_v3(uuid,text,text,text,text,text,text,jsonb,text,text,uuid,numeric,numeric) to anon,authenticated;
