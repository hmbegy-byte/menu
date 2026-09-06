-- Secure access and atomic mutations for the operational suite.
-- This migration is additive and safe to apply after 20260907000300.

create or replace function public.is_store_org_member(
  target_store uuid,
  allowed_roles text[] default array['owner','admin','manager','accountant']
)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store
      and public.is_org_member(s.organization_id, allowed_roles)
  );
$$;

create or replace function public.can_manage_store(target_store uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_store_member(target_store, array['admin','manager'])
      or public.is_store_org_member(target_store, array['owner','admin','manager'])
      or public.is_platform_admin();
$$;

-- Replace the first-pass policies with policies that support both store and
-- organisation membership while keeping every tenant isolated.
drop policy if exists "staff manage operational records" on public.customer_segment_rules;
create policy "managers manage segment rules" on public.customer_segment_rules for all
  using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin())
  with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());

create policy "managers manage customer consents" on public.customer_consents for all
  using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin())
  with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "managers manage retention campaigns" on public.retention_campaigns for all
  using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin())
  with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "managers read message deliveries" on public.message_deliveries for select
  using (exists(select 1 from public.retention_campaigns c where c.id=campaign_id and (public.is_org_member(c.organization_id,array['owner','admin','manager']) or public.is_platform_admin())));

create policy "managers manage value wallets" on public.value_wallets for all
  using (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin())
  with check (public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "managers read value ledger" on public.value_ledger for select
  using (exists(select 1 from public.value_wallets w where w.id=wallet_id and (public.is_org_member(w.organization_id,array['owner','admin','manager']) or public.is_platform_admin())));

create policy "managers manage product costs" on public.product_costs for all
  using (exists(select 1 from public.products p where p.id=product_id and public.can_manage_store(p.store_id)))
  with check (exists(select 1 from public.products p where p.id=product_id and public.can_manage_store(p.store_id)));
create policy "managers manage order costs" on public.order_costs for all
  using (exists(select 1 from public.orders o where o.id=order_id and public.can_manage_store(o.store_id)))
  with check (exists(select 1 from public.orders o where o.id=order_id and public.can_manage_store(o.store_id)));

create policy "staff manage substitutions" on public.substitution_proposals for all
  using (exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and (public.is_store_member(o.store_id) or public.is_store_org_member(o.store_id,array['owner','admin','manager']))))
  with check (exists(select 1 from public.order_items oi join public.orders o on o.id=oi.order_id where oi.id=order_item_id and (public.is_store_member(o.store_id) or public.is_store_org_member(o.store_id,array['owner','admin','manager']))));
create policy "staff manage order issues" on public.order_issues for all
  using (exists(select 1 from public.orders o where o.id=order_id and (public.is_store_member(o.store_id) or public.is_store_org_member(o.store_id,array['owner','admin','manager']))))
  with check (exists(select 1 from public.orders o where o.id=order_id and (public.is_store_member(o.store_id) or public.is_store_org_member(o.store_id,array['owner','admin','manager']))));
create policy "managers manage resolutions" on public.resolution_actions for all
  using (exists(select 1 from public.order_issues i join public.orders o on o.id=i.order_id where i.id=issue_id and public.can_manage_store(o.store_id)))
  with check (exists(select 1 from public.order_issues i join public.orders o on o.id=i.order_id where i.id=issue_id and public.can_manage_store(o.store_id)));

drop policy if exists "staff manage store limited offers" on public.limited_offers;
create policy "public reads live limited offers" on public.limited_offers for select
  using (is_active and now() between sale_starts_at and sale_ends_at);
create policy "managers manage limited offers" on public.limited_offers for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
drop policy if exists "staff manage capacity" on public.capacity_slots;
create policy "managers manage capacity" on public.capacity_slots for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));

create policy "managers manage recurring schedules" on public.recurring_schedules for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create policy "managers manage group orders" on public.group_orders for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create policy "managers manage group participants" on public.group_order_participants for all
  using (exists(select 1 from public.group_orders g where g.id=group_order_id and public.can_manage_store(g.store_id)))
  with check (exists(select 1 from public.group_orders g where g.id=group_order_id and public.can_manage_store(g.store_id)));
create policy "managers manage reservations" on public.reservations for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));

drop policy if exists "staff manage tables" on public.restaurant_tables;
create policy "managers manage tables" on public.restaurant_tables for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create policy "staff manage table sessions" on public.table_sessions for all
  using (exists(select 1 from public.restaurant_tables t where t.id=table_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))))
  with check (exists(select 1 from public.restaurant_tables t where t.id=table_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))));
create policy "staff manage service requests" on public.table_service_requests for all
  using (exists(select 1 from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=session_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))))
  with check (exists(select 1 from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=session_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))));
create policy "staff manage bill allocations" on public.bill_allocations for all
  using (exists(select 1 from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=session_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))))
  with check (exists(select 1 from public.table_sessions s join public.restaurant_tables t on t.id=s.table_id where s.id=session_id and (public.is_store_member(t.store_id) or public.is_store_org_member(t.store_id,array['owner','admin','manager']))));

create policy "managers manage channel integrations" on public.channel_integrations for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create policy "managers manage external orders" on public.external_order_map for all
  using (exists(select 1 from public.channel_integrations i where i.id=integration_id and public.can_manage_store(i.store_id)))
  with check (exists(select 1 from public.channel_integrations i where i.id=integration_id and public.can_manage_store(i.store_id)));

drop policy if exists "staff manage stations" on public.preparation_stations;
create policy "staff read stations" on public.preparation_stations for select
  using (public.is_store_member(store_id) or public.is_store_org_member(store_id,array['owner','admin','manager']));
create policy "managers manage stations" on public.preparation_stations for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
drop policy if exists "staff manage inventory" on public.inventory_items;
create policy "staff read inventory" on public.inventory_items for select
  using (public.is_store_member(store_id) or public.is_store_org_member(store_id,array['owner','admin','manager']));
create policy "managers manage inventory" on public.inventory_items for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  delta numeric(14,3) not null check(delta <> 0),
  reason text not null,
  idempotency_key text not null unique,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.inventory_adjustments enable row level security;
create policy "staff read inventory adjustments" on public.inventory_adjustments for select
  using (exists(select 1 from public.inventory_items i where i.id=inventory_item_id and (public.is_store_member(i.store_id) or public.is_store_org_member(i.store_id,array['owner','admin','manager']))));
create policy "managers manage recipes" on public.recipe_components for all
  using (exists(select 1 from public.products p where p.id=product_id and public.can_manage_store(p.store_id)))
  with check (exists(select 1 from public.products p join public.inventory_items i on i.id=inventory_item_id where p.id=product_id and p.store_id=i.store_id and public.can_manage_store(p.store_id)));

drop policy if exists "staff manage imports" on public.menu_import_jobs;
create policy "managers manage import jobs" on public.menu_import_jobs for all
  using (public.can_manage_store(store_id)) with check (public.can_manage_store(store_id));
create policy "managers manage import items" on public.menu_import_items for all
  using (exists(select 1 from public.menu_import_jobs j where j.id=job_id and public.can_manage_store(j.store_id)))
  with check (exists(select 1 from public.menu_import_jobs j where j.id=job_id and public.can_manage_store(j.store_id)));

create or replace function public.reserve_limited_offer(p_offer_id uuid,p_quantity integer)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if p_quantity is null or p_quantity < 1 or p_quantity > 100 then return false; end if;
  update public.limited_offers
     set reserved_quantity=reserved_quantity+p_quantity
   where id=p_offer_id and is_active
     and now() between sale_starts_at and sale_ends_at
     and total_quantity-reserved_quantity-sold_quantity>=p_quantity;
  return found;
end $$;
revoke all on function public.reserve_limited_offer(uuid,integer) from public;
grant execute on function public.reserve_limited_offer(uuid,integer) to anon,authenticated;

create or replace function public.apply_wallet_entry(p_wallet_id uuid,p_amount numeric,p_type text,p_reason text,p_idempotency text)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_balance numeric; v_org uuid; v_inserted uuid;
begin
  if p_amount = 0 or p_type not in ('earn','redeem','expire','reverse','refund','adjust') then raise exception 'Invalid wallet entry'; end if;
  select balance,organization_id into v_balance,v_org from public.value_wallets where id=p_wallet_id for update;
  if not found then raise exception 'Wallet not found'; end if;
  if not (public.is_org_member(v_org,array['owner','admin','manager']) or public.is_platform_admin()) then raise exception 'Not authorized'; end if;
  if p_amount<0 and v_balance+p_amount<0 then raise exception 'Insufficient wallet balance'; end if;
  insert into public.value_ledger(wallet_id,amount,entry_type,reason,idempotency_key)
  values(p_wallet_id,p_amount,p_type,p_reason,p_idempotency)
  on conflict(idempotency_key) do nothing returning id into v_inserted;
  if v_inserted is not null then
    update public.value_wallets set balance=balance+p_amount where id=p_wallet_id returning balance into v_balance;
  end if;
  return v_balance;
end $$;
revoke all on function public.apply_wallet_entry(uuid,numeric,text,text,text) from public;
grant execute on function public.apply_wallet_entry(uuid,numeric,text,text,text) to authenticated;

create or replace function public.adjust_inventory(p_item_id uuid,p_delta numeric,p_reason text,p_idempotency text)
returns numeric language plpgsql security definer set search_path=public as $$
declare v_store uuid; v_on_hand numeric; v_inserted uuid;
begin
  if p_delta = 0 or nullif(trim(p_reason),'') is null or nullif(trim(p_idempotency),'') is null then raise exception 'Invalid adjustment'; end if;
  select store_id,on_hand into v_store,v_on_hand from public.inventory_items where id=p_item_id for update;
  if not found or not public.can_manage_store(v_store) then raise exception 'Not authorized'; end if;
  if v_on_hand+p_delta < 0 then raise exception 'Inventory cannot be negative'; end if;
  insert into public.inventory_adjustments(inventory_item_id,delta,reason,idempotency_key,created_by)
  values(p_item_id,p_delta,trim(p_reason),p_idempotency,auth.uid())
  on conflict(idempotency_key) do nothing returning id into v_inserted;
  if v_inserted is not null then
    update public.inventory_items set on_hand=on_hand+p_delta where id=p_item_id returning on_hand into v_on_hand;
  end if;
  return v_on_hand;
end $$;
revoke all on function public.adjust_inventory(uuid,numeric,text,text) from public;
grant execute on function public.adjust_inventory(uuid,numeric,text,text) to authenticated;

create or replace function public.queue_retention_campaign(p_campaign_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare v_campaign public.retention_campaigns; v_rule public.customer_segment_rules; v_count integer;
begin
  select * into v_campaign from public.retention_campaigns where id=p_campaign_id for update;
  if not found or not (public.is_org_member(v_campaign.organization_id,array['owner','admin','manager']) or public.is_platform_admin()) then raise exception 'Not authorized'; end if;
  if v_campaign.status not in ('draft','scheduled') then raise exception 'Campaign cannot be queued'; end if;
  if v_campaign.segment_rule_id is not null then
    select * into v_rule from public.customer_segment_rules where id=v_campaign.segment_rule_id and organization_id=v_campaign.organization_id and is_active;
    if not found then raise exception 'Segment rule is unavailable'; end if;
  end if;
  insert into public.message_deliveries(campaign_id,customer_id,status,idempotency_key)
  select v_campaign.id,c.id,'queued',v_campaign.id::text||':'||c.id::text
  from public.customer_profiles c
  join public.customer_consents consent on consent.customer_id=c.id and consent.organization_id=c.organization_id and consent.channel='whatsapp' and consent.status='opted_in'
  where c.organization_id=v_campaign.organization_id
    and (
      v_campaign.segment_rule_id is null
      or (v_rule.kind='new' and c.orders_count<=coalesce((v_rule.criteria->>'max_orders')::integer,1))
      or (v_rule.kind='repeat' and c.orders_count>=coalesce((v_rule.criteria->>'min_orders')::integer,2))
      or (v_rule.kind='high_value' and c.total_spent>=coalesce((v_rule.criteria->>'min_spent')::numeric,500))
      or (v_rule.kind='inactive' and c.last_order_at<now()-make_interval(days=>coalesce((v_rule.criteria->>'days')::integer,30)))
      or (v_rule.kind='custom'
          and c.orders_count>=coalesce((v_rule.criteria->>'min_orders')::integer,0)
          and c.total_spent>=coalesce((v_rule.criteria->>'min_spent')::numeric,0)
          and (v_rule.criteria->>'inactive_days' is null or c.last_order_at<now()-make_interval(days=>(v_rule.criteria->>'inactive_days')::integer)))
    )
  on conflict(idempotency_key) do nothing;
  get diagnostics v_count=row_count;
  update public.retention_campaigns set status='scheduled',scheduled_at=coalesce(scheduled_at,now()) where id=v_campaign.id;
  return v_count;
end $$;
revoke all on function public.queue_retention_campaign(uuid) from public;
grant execute on function public.queue_retention_campaign(uuid) to authenticated;

create index if not exists limited_offers_store_window_idx on public.limited_offers(store_id,is_active,sale_starts_at,sale_ends_at);
create index if not exists capacity_slots_store_start_idx on public.capacity_slots(store_id,starts_at);
create index if not exists inventory_items_store_stock_idx on public.inventory_items(store_id,on_hand,reorder_level);
create index if not exists products_station_idx on public.products(station_id) where station_id is not null;
