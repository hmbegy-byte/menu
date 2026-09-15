-- Optional, zero-provider restaurant operations upgrades.
-- Additive only: no existing records are removed or rewritten.

create table if not exists public.order_display_boards (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  access_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(store_id)
);

alter table public.orders add column if not exists pickup_method text not null default 'counter'
  check (pickup_method in ('counter','curbside'));
alter table public.orders add column if not exists car_description text;
alter table public.orders add column if not exists curbside_arrived_at timestamptz;
alter table public.orders add column if not exists curbside_acknowledged_at timestamptz;
alter table public.orders add column if not exists checkout_context_hash text;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  category text not null,
  expense_date date not null default current_date,
  amount numeric(14,2) not null check (amount > 0),
  description text not null default '',
  reporting_scope text not null default 'store_only'
    check (reporting_scope in ('store_only','organization_shared')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.expense_audit_log (
  id bigint generated always as identity primary key,
  expense_id uuid not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  action text not null check (action in ('insert','update','delete')),
  before_data jsonb,
  after_data jsonb,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

alter table public.inventory_items add column if not exists unit_cost numeric(14,4)
  check (unit_cost is null or unit_cost >= 0);
alter table public.recipe_components add column if not exists unit text;
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete restrict,
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  quantity_delta numeric(14,3) not null check (quantity_delta <> 0),
  movement_type text not null check (movement_type in ('order_consumption','waste','adjustment','restock')),
  reason text not null,
  expires_on date,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.order_costs add column if not exists ingredient_cost_missing boolean not null default false;
alter table public.order_costs add column if not exists packaging_cost_missing boolean not null default false;
alter table public.order_costs add column if not exists operating_cost_missing boolean not null default false;
alter table public.order_costs add column if not exists revenue_snapshot numeric(14,2);
alter table public.order_costs add column if not exists tax_snapshot numeric(14,2);
alter table public.order_costs add column if not exists delivery_fee_snapshot numeric(14,2);
alter table public.order_costs add column if not exists discount_snapshot numeric(14,2);
alter table public.order_costs add column if not exists refunded_snapshot numeric(14,2);

do $$ declare t text; begin
  foreach t in array array['order_display_boards','expenses','expense_audit_log','inventory_movements'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

create policy "admins manage order boards" on public.order_display_boards for all
  using (public.can_manage_store(store_id))
  with check (public.can_manage_store(store_id));
create policy "finance staff manage expenses" on public.expenses for all
  using (public.is_store_member(store_id,array['admin','manager','accountant']) or public.is_store_org_member(store_id,array['owner','admin','manager','accountant']) or public.is_platform_admin())
  with check (public.is_store_member(store_id,array['admin','manager','accountant']) or public.is_store_org_member(store_id,array['owner','admin','manager','accountant']) or public.is_platform_admin());
create policy "finance staff read expense audit" on public.expense_audit_log for select
  using (public.is_store_member(store_id,array['admin','manager','accountant']) or public.is_store_org_member(store_id,array['owner','admin','manager','accountant']) or public.is_platform_admin());
create policy "staff read inventory movements" on public.inventory_movements for select
  using (public.is_store_member(store_id,array['admin','manager','kitchen','accountant']) or public.is_store_org_member(store_id,array['owner','admin','manager','accountant']) or public.is_platform_admin());
create policy "managers write inventory movements" on public.inventory_movements for insert
  with check (public.is_store_member(store_id,array['admin','manager','kitchen']) or public.can_manage_store(store_id));
-- Recipe access is already constrained by the tenant-safe policy installed in
-- 20260907000400_secure_operational_workflows.sql. Do not add a second, weaker policy here.

create or replace function public.audit_expense_change() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.expense_audit_log(expense_id,store_id,action,before_data,after_data,changed_by)
  values(coalesce(new.id,old.id),coalesce(new.store_id,old.store_id),lower(tg_op),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,auth.uid());
  return coalesce(new,old);
end $$;
drop trigger if exists expense_audit_change on public.expenses;
create trigger expense_audit_change after insert or update or delete on public.expenses
for each row execute function public.audit_expense_change();

create or replace function public.order_board_snapshot(p_access_token uuid)
returns table(order_number bigint,status text,updated_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
  select o.order_number,o.status,coalesce(o.ready_at,o.accepted_at,o.created_at)
  from public.order_display_boards b join public.orders o on o.store_id=b.store_id
  where b.access_token=p_access_token and b.is_active and o.status in ('preparing','ready')
    and o.created_at > now()-interval '1 day'
  order by case o.status when 'ready' then 0 else 1 end,o.created_at;
$$;
revoke all on function public.order_board_snapshot(uuid) from public;
grant execute on function public.order_board_snapshot(uuid) to anon,authenticated;

create or replace function public.customer_curbside_arrived(p_tracking_token uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders;
begin
  select * into o from public.orders where tracking_token=p_tracking_token for update;
  if not found or o.pickup_method<>'curbside' then raise exception 'الطلب غير متاح للاستلام من السيارة'; end if;
  if o.status not in ('preparing','ready') then raise exception 'لا يمكن إرسال تنبيه الوصول في هذه المرحلة'; end if;
  if o.curbside_arrived_at is null then
    update public.orders set curbside_arrived_at=now() where id=o.id;
    return 'CREATED';
  end if;
  return 'ALREADY_RECORDED';
end $$;
revoke all on function public.customer_curbside_arrived(uuid) from public;
grant execute on function public.customer_curbside_arrived(uuid) to anon,authenticated;

create or replace function public.acknowledge_curbside_arrival(p_store uuid,p_order uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not (public.is_store_member(p_store,array['admin','manager','kitchen']) or public.can_manage_store(p_store)) then raise exception 'Not authorized'; end if;
  update public.orders set curbside_acknowledged_at=coalesce(curbside_acknowledged_at,now())
  where id=p_order and store_id=p_store and curbside_arrived_at is not null;
  return found;
end $$;
revoke all on function public.acknowledge_curbside_arrival(uuid,uuid) from public,anon;
grant execute on function public.acknowledge_curbside_arrival(uuid,uuid) to authenticated;

create or replace function public.record_inventory_movement(
  p_store uuid,p_item uuid,p_delta numeric,p_type text,p_reason text,p_idempotency text,p_expires_on date default null
) returns numeric language plpgsql security definer set search_path=public,pg_temp as $$
declare v_current numeric; v_existing public.inventory_movements;
begin
  if not (public.is_store_member(p_store,array['admin','manager','kitchen']) or public.can_manage_store(p_store)) then raise exception 'Not authorized'; end if;
  if p_type not in ('waste','adjustment','restock') then raise exception 'Invalid manual movement type'; end if;
  select * into v_existing from public.inventory_movements where idempotency_key=p_idempotency;
  if found then
    if v_existing.store_id<>p_store or v_existing.inventory_item_id<>p_item or v_existing.quantity_delta<>p_delta then raise exception 'Idempotency conflict'; end if;
    return (select on_hand from public.inventory_items where id=p_item and store_id=p_store);
  end if;
  select on_hand into v_current from public.inventory_items where id=p_item and store_id=p_store for update;
  if not found or v_current+p_delta<0 then raise exception 'Insufficient or missing inventory'; end if;
  update public.inventory_items set on_hand=on_hand+p_delta where id=p_item and store_id=p_store;
  insert into public.inventory_movements(store_id,inventory_item_id,quantity_delta,movement_type,reason,expires_on,idempotency_key,created_by)
  values(p_store,p_item,p_delta,p_type,trim(p_reason),p_expires_on,p_idempotency,auth.uid());
  return v_current+p_delta;
end $$;
revoke all on function public.record_inventory_movement(uuid,uuid,numeric,text,text,text,date) from public,anon;
grant execute on function public.record_inventory_movement(uuid,uuid,numeric,text,text,text,date) to authenticated;

create or replace function public.snapshot_order_cost(p_order uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; v_ingredient numeric; v_packaging numeric; v_missing_i boolean; v_missing_p boolean;
  v_payment numeric; v_delivery numeric; v_commission numeric; v_missing_o boolean; v_settings jsonb;
begin
  select * into o from public.orders where id=p_order;
  if not found or exists(select 1 from public.order_costs where order_id=p_order) then return; end if;
  select coalesce(sum(oi.quantity*rc.quantity*ii.unit_cost),0),
    bool_or(rc.product_id is null or ii.unit_cost is null)
  into v_ingredient,v_missing_i
  from public.order_items oi left join public.recipe_components rc on rc.product_id=oi.product_id
  left join public.inventory_items ii on ii.id=rc.inventory_item_id where oi.order_id=p_order;
  select coalesce(sum(oi.quantity*pc.packaging_cost),0),bool_or(pc.product_id is null)
  into v_packaging,v_missing_p from public.order_items oi left join public.product_costs pc on pc.product_id=oi.product_id
  where oi.order_id=p_order;
  select settings into v_settings from public.stores where id=o.store_id;
  v_missing_o := not (v_settings ? 'defaultPaymentFee' and v_settings ? 'defaultCommissionPercent')
    or (o.order_type='delivery' and not (v_settings ? 'defaultDeliveryFulfillmentCost'));
  v_payment := coalesce((v_settings->>'defaultPaymentFee')::numeric,0);
  v_delivery := case when o.order_type='delivery' then coalesce((v_settings->>'defaultDeliveryFulfillmentCost')::numeric,0) else 0 end;
  v_commission := coalesce(o.total_amount*((v_settings->>'defaultCommissionPercent')::numeric)/100,0);
  insert into public.order_costs(order_id,product_cost,packaging_cost,payment_fee,delivery_cost,commission,discount,refund,inputs_complete,
    ingredient_cost_missing,packaging_cost_missing,operating_cost_missing,revenue_snapshot,tax_snapshot,delivery_fee_snapshot,discount_snapshot,refunded_snapshot)
  values(p_order,v_ingredient,v_packaging,v_payment,v_delivery,v_commission,coalesce(o.discount_amount,0),coalesce(o.refunded_amount,0),
    not coalesce(v_missing_i,true) and not coalesce(v_missing_p,true) and not v_missing_o,coalesce(v_missing_i,true),coalesce(v_missing_p,true),v_missing_o,
    o.total_amount,o.tax_amount,o.delivery_fee,coalesce(o.discount_amount,0),coalesce(o.refunded_amount,0));
end $$;
revoke all on function public.snapshot_order_cost(uuid) from public,anon,authenticated;

create or replace function public.consume_order_inventory(p_store uuid,p_order uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; v_key text; v_enabled boolean;
begin
  select coalesce((settings->>'inventoryEnabled')::boolean,false) into v_enabled from public.stores where id=p_store;
  if not coalesce(v_enabled,false) then
    perform public.snapshot_order_cost(p_order);
    return;
  end if;
  for r in
    select rc.inventory_item_id,sum(oi.quantity*rc.quantity)::numeric(14,3) qty
    from public.order_items oi join public.products p on p.id=oi.product_id and p.store_id=p_store
    join public.recipe_components rc on rc.product_id=p.id
    where oi.order_id=p_order group by rc.inventory_item_id order by rc.inventory_item_id
  loop
    v_key:='order:'||p_order::text||':item:'||r.inventory_item_id::text;
    if not exists(select 1 from public.inventory_movements where idempotency_key=v_key) then
      perform 1 from public.inventory_items where id=r.inventory_item_id and store_id=p_store for update;
      if not found or (select on_hand from public.inventory_items where id=r.inventory_item_id)<r.qty then
        raise exception 'مخزون أحد مكونات الوصفة غير كاف';
      end if;
      update public.inventory_items set on_hand=on_hand-r.qty where id=r.inventory_item_id and store_id=p_store;
      insert into public.inventory_movements(store_id,inventory_item_id,order_id,quantity_delta,movement_type,reason,idempotency_key)
      values(p_store,r.inventory_item_id,p_order,-r.qty,'order_consumption','خصم عند بدء التحضير',v_key);
    end if;
  end loop;
  perform public.snapshot_order_cost(p_order);
end $$;
revoke all on function public.consume_order_inventory(uuid,uuid) from public,anon,authenticated;

create or replace function public.kitchen_set_status(p_store uuid,p_order uuid,p_expected text,p_target text,p_command uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; c public.kitchen_commands;
begin
 if auth.uid() is null or not exists(select 1 from public.store_members where store_id=p_store and user_id=auth.uid() and role in ('admin','kitchen')) then raise exception 'Not authorized'; end if;
 if p_command is null or p_expected is null or p_target is null then raise exception 'Command and states required'; end if;
 perform pg_advisory_xact_lock(hashtext(p_command::text));
 select * into c from public.kitchen_commands where id=p_command;
 if found then
   if c.store_id<>p_store or c.order_id<>p_order or c.user_id<>auth.uid() or c.target_status<>p_target or c.expected_status<>p_expected then raise exception 'Command conflict'; end if;
   return 'APPLIED';
 end if;
 select * into o from public.orders where id=p_order and store_id=p_store for update;
 if not found then raise exception 'Order unavailable'; end if;
 if o.status<>p_expected then return 'STALE'; end if;
 if not ((p_expected='pending' and p_target in ('preparing','cancelled')) or (p_expected='preparing' and p_target in ('ready','cancelled')) or (p_expected='ready' and p_target in ('completed','cancelled'))) then raise exception 'Invalid transition'; end if;
 if p_target='preparing' then perform public.consume_order_inventory(p_store,p_order); end if;
 if p_target='completed' then perform public.snapshot_order_cost(p_order); end if;
 update public.orders set status=p_target,
 accepted_at=case when p_target='preparing' then now() else accepted_at end,
 ready_at=case when p_target='ready' then now() else ready_at end,
 completed_at=case when p_target='completed' then now() else completed_at end
 where id=p_order;
 insert into public.kitchen_commands(id,store_id,user_id,order_id,expected_status,target_status) values(p_command,p_store,auth.uid(),p_order,p_expected,p_target);
 return 'APPLIED';
end $$;

create or replace function public.create_order_v5(
  p_store_id uuid,p_customer_name text,p_customer_phone text,p_order_type text,
  p_delivery_address text,p_notes text,p_payment_method text,p_items jsonb,
  p_delivery_zone_id text default null,p_table_number text default null,
  p_idempotency_key uuid default null,p_delivery_latitude numeric default null,
  p_delivery_longitude numeric default null,p_campaign_slug text default null,
  p_attribution_source text default null,p_pickup_method text default 'counter',p_car_description text default null
) returns table(id uuid,order_number bigint,total_amount numeric,tracking_token uuid,promised_at timestamptz,payment_status text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_created record; v_enabled boolean; v_hash text; v_existing_hash text;
begin
  if p_pickup_method not in ('counter','curbside') then raise exception 'طريقة الاستلام غير صحيحة'; end if;
  select coalesce((settings->>'curbsideEnabled')::boolean,false) into v_enabled from public.stores where stores.id=p_store_id;
  if p_pickup_method='curbside' and (p_order_type<>'pickup' or not coalesce(v_enabled,false) or nullif(trim(p_car_description),'') is null) then
    raise exception 'بيانات الاستلام من السيارة غير مكتملة';
  end if;
  v_hash := encode(digest(concat_ws('|',p_order_type,p_pickup_method,coalesce(trim(p_car_description),'')),'sha256'),'hex');
  select * into v_created from public.create_order_v4(p_store_id,p_customer_name,p_customer_phone,p_order_type,p_delivery_address,p_notes,p_payment_method,p_items,p_delivery_zone_id,p_table_number,p_idempotency_key,p_delivery_latitude,p_delivery_longitude,p_campaign_slug,p_attribution_source);
  select checkout_context_hash into v_existing_hash from public.orders where orders.id=v_created.id for update;
  if v_existing_hash is null then
    update public.orders set pickup_method=p_pickup_method,car_description=case when p_pickup_method='curbside' then trim(p_car_description) end,checkout_context_hash=v_hash where orders.id=v_created.id;
  elsif v_existing_hash<>v_hash then
    raise exception 'تعارض في بيانات إعادة محاولة الطلب';
  end if;
  return query select v_created.id,v_created.order_number,v_created.total_amount,v_created.tracking_token,v_created.promised_at,v_created.payment_status;
end $$;
revoke all on function public.create_order_v5(uuid,text,text,text,text,text,text,jsonb,text,text,uuid,numeric,numeric,text,text,text,text) from public;
grant execute on function public.create_order_v5(uuid,text,text,text,text,text,text,jsonb,text,text,uuid,numeric,numeric,text,text,text,text) to anon,authenticated;

create or replace function public.valid_google_review_url(p_url text) returns boolean
language sql immutable set search_path=public,pg_temp as $$
  select coalesce(
    p_url ~* '^https://(www\.)?google\.[a-z.]+/maps/'
    or p_url ~* '^https://maps\.app\.goo\.gl/'
    or p_url ~* '^https://g\.page/', false
  );
$$;

drop function if exists public.track_order(uuid);
create function public.track_order(p_tracking_token uuid)
returns table(order_number bigint,status text,order_type text,delivery_zone text,table_number text,total_amount numeric,promised_at timestamptz,delayed_minutes integer,store_slug text,currency text,store_id uuid,pickup_method text,curbside_arrived_at timestamptz,curbside_acknowledged_at timestamptz,google_review_url text)
language sql stable security definer set search_path=public,pg_temp as $$
  select o.order_number,o.status,o.order_type,o.delivery_zone,o.table_number,o.total_amount,o.promised_at,o.delayed_minutes,s.slug,s.currency,s.id,o.pickup_method,o.curbside_arrived_at,o.curbside_acknowledged_at,
    case when o.status='completed' and coalesce((s.settings->>'googleReviewEnabled')::boolean,false)
      and public.valid_google_review_url(s.settings->>'googleReviewUrl')
      then nullif(s.settings->>'googleReviewUrl','') end
  from public.orders o join public.stores s on s.id=o.store_id where o.tracking_token=p_tracking_token limit 1;
$$;
grant execute on function public.track_order(uuid) to anon,authenticated;

create or replace function public.restaurant_profitability_report(p_store uuid,p_from timestamptz,p_to timestamptz)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  with costs as (
    select coalesce(sum(greatest(coalesce(oc.revenue_snapshot,o.total_amount)-coalesce(oc.refunded_snapshot,o.refunded_amount,0)-coalesce(oc.tax_snapshot,o.tax_amount,0),0)),0) revenue,
      coalesce(sum(coalesce(oc.product_cost,0)+coalesce(oc.packaging_cost,0)+coalesce(oc.payment_fee,0)+coalesce(oc.delivery_cost,0)+coalesce(oc.commission,0)),0) variable_costs,
      count(*) filter(where not oc.inputs_complete) incomplete
    from public.order_costs oc join public.orders o on o.id=oc.order_id
    where o.store_id=p_store and o.status='completed' and o.completed_at>=p_from and o.completed_at<p_to
  ), expenses_sum as (
    select coalesce(sum(amount),0) expenses from public.expenses
    where store_id=p_store and reporting_scope='store_only'
      and expense_date>=p_from::date and expense_date<p_to::date
  ) select jsonb_build_object('revenue',c.revenue,'variable_costs',c.variable_costs,
    'contribution_margin',c.revenue-c.variable_costs,'recorded_expenses',e.expenses,
    'result_after_recorded_expenses',c.revenue-c.variable_costs-e.expenses,'incomplete_cost_orders',c.incomplete)
  from costs c cross join expenses_sum e
  where public.is_store_member(p_store,array['admin','manager','accountant'])
    or public.is_store_org_member(p_store,array['owner','admin','manager','accountant'])
    or public.is_platform_admin();
$$;
revoke all on function public.restaurant_profitability_report(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.restaurant_profitability_report(uuid,timestamptz,timestamptz) to authenticated;

comment on function public.restaurant_profitability_report(uuid,timestamptz,timestamptz) is
'Operational contribution report based on captured costs and recorded expenses; it is not accounting net profit.';
