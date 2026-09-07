-- Flavor Flow differentiation MVP: campaign attribution, secure reorder and strict product options.
-- Additive only. No production seed data.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  source text not null check (source in ('instagram','snapchat','whatsapp','influencer','other')),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(store_id, slug)
);

alter table public.orders add column if not exists campaign_id uuid references public.campaigns(id) on delete set null;
alter table public.orders add column if not exists attribution_source text;
alter table public.orders add column if not exists refunded_amount numeric(12,2) not null default 0 check(refunded_amount >= 0);

create table if not exists public.campaign_conversions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  attributed_at timestamptz not null default now(),
  unique(order_id)
);

create table if not exists public.saved_usual_orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  access_token uuid not null default gen_random_uuid() unique,
  source_order_id uuid not null references public.orders(id) on delete cascade,
  label text not null default 'طلبي المعتاد',
  items jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(store_id, source_order_id)
);

alter table public.campaigns enable row level security;
alter table public.campaign_conversions enable row level security;
alter table public.saved_usual_orders enable row level security;

create policy "staff manage own store campaigns" on public.campaigns for all
  using (public.is_store_member(store_id,array['admin','manager']))
  with check (public.is_store_member(store_id,array['admin','manager']));
create policy "staff read own conversions" on public.campaign_conversions for select
  using (exists(select 1 from public.campaigns c where c.id=campaign_id and public.is_store_member(c.store_id,array['admin','manager','accountant'])));

create or replace function public.validate_order_item_options()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_product public.products;
  v_group jsonb;
  v_choice jsonb;
  v_selected jsonb := coalesce(new.selected_options,'[]'::jsonb);
  v_count integer;
  v_min integer;
  v_max integer;
  v_extra numeric := 0;
begin
  select * into v_product from public.products where id=new.product_id and is_available for share;
  if not found then raise exception 'الصنف غير متاح'; end if;
  for v_group in select * from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) loop
    v_min := coalesce((v_group->>'min_selections')::integer, case when coalesce((v_group->>'required')::boolean,false) then 1 else 0 end);
    v_max := coalesce((v_group->>'max_selections')::integer, case when coalesce((v_group->>'multiple')::boolean,false) then 99 else 1 end);
    select count(*) into v_count from jsonb_array_elements(v_selected) selected
      where selected->>'group_id'=coalesce(v_group->>'id',v_group->>'title')
         or (selected->>'group_id' is null and exists(
           select 1 from jsonb_array_elements(coalesce(v_group->'choices','[]'::jsonb)) c
           where coalesce(c->>'id',c->>'name',c->>'label')=coalesce(selected->>'choice_id',selected->>'name')));
    if v_count < v_min or v_count > v_max then raise exception 'اختيارات % يجب أن تكون بين % و%',v_group->>'title',v_min,v_max; end if;
  end loop;
  for v_choice in select * from jsonb_array_elements(v_selected) loop
    if not exists(
      select 1 from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) g,
                    jsonb_array_elements(coalesce(g->'choices','[]'::jsonb)) c
      where (v_choice->>'group_id' is null or v_choice->>'group_id'=coalesce(g->>'id',g->>'title'))
        and coalesce(v_choice->>'choice_id',v_choice->>'name')=coalesce(c->>'id',c->>'name',c->>'label')
        and coalesce((c->>'is_available')::boolean,true)
    ) then raise exception 'أحد اختيارات الصنف غير صالح أو غير متاح'; end if;
    select coalesce(nullif(c->>'extra_price','')::numeric,nullif(c->>'price','')::numeric,0) into v_extra
      from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) g,
           jsonb_array_elements(coalesce(g->'choices','[]'::jsonb)) c
      where (v_choice->>'group_id' is null or v_choice->>'group_id'=coalesce(g->>'id',g->>'title'))
        and coalesce(v_choice->>'choice_id',v_choice->>'name')=coalesce(c->>'id',c->>'name',c->>'label')
      limit 1;
    new.unit_price := new.unit_price + coalesce(v_extra,0);
  end loop;
  new.unit_price := v_product.price + coalesce((select sum(coalesce(nullif(c->>'extra_price','')::numeric,nullif(c->>'price','')::numeric,0))
    from jsonb_array_elements(v_selected) selected
    join lateral (select c from jsonb_array_elements(coalesce(v_product.options,'[]'::jsonb)) g,
      jsonb_array_elements(coalesce(g->'choices','[]'::jsonb)) c
      where (selected->>'group_id' is null or selected->>'group_id'=coalesce(g->>'id',g->>'title'))
        and coalesce(selected->>'choice_id',selected->>'name')=coalesce(c->>'id',c->>'name',c->>'label') limit 1) matched on true),0);
  return new;
end $$;

drop trigger if exists validate_order_item_options_trigger on public.order_items;
create trigger validate_order_item_options_trigger before insert or update of product_id,selected_options,unit_price on public.order_items
for each row execute function public.validate_order_item_options();

create or replace function public.create_order_v4(
  p_store_id uuid, p_customer_name text, p_customer_phone text, p_order_type text,
  p_delivery_address text, p_notes text, p_payment_method text, p_items jsonb,
  p_delivery_zone_id text default null, p_table_number text default null,
  p_idempotency_key uuid default null, p_delivery_latitude numeric default null,
  p_delivery_longitude numeric default null, p_campaign_slug text default null,
  p_attribution_source text default null
) returns table(id uuid, order_number bigint, total_amount numeric, tracking_token uuid, promised_at timestamptz, payment_status text)
language plpgsql security definer set search_path=public as $$
declare v_created record; v_campaign public.campaigns;
begin
  if p_campaign_slug is not null then
    select * into v_campaign from public.campaigns where store_id=p_store_id and slug=p_campaign_slug and is_active;
    if not found then raise exception 'رابط الحملة غير صالح لهذا المطعم'; end if;
    if p_attribution_source is not null and p_attribution_source<>v_campaign.source then raise exception 'مصدر الحملة غير صحيح'; end if;
  end if;
  select * into v_created from public.create_order_v3(p_store_id,p_customer_name,p_customer_phone,p_order_type,p_delivery_address,p_notes,p_payment_method,p_items,p_delivery_zone_id,p_table_number,p_idempotency_key,p_delivery_latitude,p_delivery_longitude);
  if v_campaign.id is not null then
    update public.orders set campaign_id=v_campaign.id,attribution_source=v_campaign.source where orders.id=v_created.id and campaign_id is null;
    insert into public.campaign_conversions(campaign_id,order_id) values(v_campaign.id,v_created.id) on conflict(order_id) do nothing;
  end if;
  return query select v_created.id,v_created.order_number,v_created.total_amount,v_created.tracking_token,v_created.promised_at,v_created.payment_status;
end $$;
grant execute on function public.create_order_v4(uuid,text,text,text,text,text,text,jsonb,text,text,uuid,numeric,numeric,text,text) to anon,authenticated;

create or replace function public.campaign_metrics(p_store_id uuid,p_from timestamptz,p_to timestamptz)
returns table(campaign_id uuid,name text,source text,orders_count bigint,net_sales numeric,average_order_value numeric)
language sql stable security definer set search_path=public as $$
  select c.id,c.name,c.source,
    count(o.id) filter(where o.status<>'cancelled' and o.refunded_amount<o.total_amount),
    coalesce(sum(greatest(o.total_amount-o.refunded_amount,0)) filter(where o.status<>'cancelled'),0),
    coalesce(avg(greatest(o.total_amount-o.refunded_amount,0)) filter(where o.status<>'cancelled' and o.refunded_amount<o.total_amount),0)
  from public.campaigns c left join public.campaign_conversions cc on cc.campaign_id=c.id
  left join public.orders o on o.id=cc.order_id and o.created_at>=p_from and o.created_at<p_to
  where c.store_id=p_store_id and public.is_store_member(p_store_id,array['admin','manager','accountant']) group by c.id,c.name,c.source order by 5 desc;
$$;
grant execute on function public.campaign_metrics(uuid,timestamptz,timestamptz) to authenticated;

create or replace function public.reorder_preview(p_store_id uuid,p_tracking_token uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('order_number',o.order_number,'items',coalesce(jsonb_agg(jsonb_build_object(
    'product_id',oi.product_id,'name',oi.product_name,'quantity',oi.quantity,'previous_unit_price',oi.unit_price,
    'current_price',p.price,'is_available',coalesce(p.is_available,false),'selected_options',oi.selected_options,'current_options',coalesce(p.options,'[]'::jsonb)
  ) order by oi.id),'[]'::jsonb))
  from public.orders o join public.order_items oi on oi.order_id=o.id left join public.products p on p.id=oi.product_id and p.store_id=p_store_id
  where o.store_id=p_store_id and o.tracking_token=p_tracking_token group by o.id;
$$;
grant execute on function public.reorder_preview(uuid,uuid) to anon,authenticated;

create or replace function public.save_usual_order(p_store_id uuid,p_tracking_token uuid,p_label text default 'طلبي المعتاد')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_order public.orders; v_token uuid;
begin
  select * into v_order from public.orders where store_id=p_store_id and tracking_token=p_tracking_token;
  if not found then raise exception 'الطلب غير موجود'; end if;
  insert into public.saved_usual_orders(store_id,source_order_id,label,items)
  select p_store_id,v_order.id,coalesce(nullif(trim(p_label),''),'طلبي المعتاد'),jsonb_agg(jsonb_build_object('product_id',oi.product_id,'quantity',oi.quantity,'selected_options',oi.selected_options))
  from public.order_items oi where oi.order_id=v_order.id
  on conflict(store_id,source_order_id) do update set label=excluded.label,items=excluded.items,updated_at=now()
  returning access_token into v_token;
  return v_token;
end $$;
grant execute on function public.save_usual_order(uuid,uuid,text) to anon,authenticated;

create or replace function public.usual_order_preview(p_store_id uuid,p_access_token uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object('label',u.label,'items',coalesce(jsonb_agg(jsonb_build_object(
    'product_id',item->>'product_id','name',p.name,'quantity',(item->>'quantity')::integer,'previous_unit_price',null,
    'current_price',p.price,'is_available',coalesce(p.is_available,false),'selected_options',coalesce(item->'selected_options','[]'::jsonb),'current_options',coalesce(p.options,'[]'::jsonb)
  )),'[]'::jsonb))
  from public.saved_usual_orders u cross join lateral jsonb_array_elements(u.items) item
  left join public.products p on p.id=(item->>'product_id')::uuid and p.store_id=p_store_id
  where u.store_id=p_store_id and u.access_token=p_access_token group by u.id;
$$;
grant execute on function public.usual_order_preview(uuid,uuid) to anon,authenticated;

drop function if exists public.track_order(uuid);
create function public.track_order(p_tracking_token uuid)
returns table(order_number bigint,status text,order_type text,delivery_zone text,table_number text,total_amount numeric,promised_at timestamptz,delayed_minutes integer,store_slug text,currency text,store_id uuid)
language sql stable security definer set search_path=public as $$
  select o.order_number,o.status,o.order_type,o.delivery_zone,o.table_number,o.total_amount,o.promised_at,o.delayed_minutes,s.slug,s.currency,s.id
  from public.orders o join public.stores s on s.id=o.store_id where o.tracking_token=p_tracking_token limit 1;
$$;
grant execute on function public.track_order(uuid) to anon,authenticated;

comment on function public.campaign_metrics(uuid,timestamptz,timestamptz) is
'Attributed order = one non-cancelled, not-fully-refunded order with a unique campaign conversion. Net sales subtract partial refunds; cancelled and fully refunded orders contribute zero. This is sales attribution, not profit or advertising ROI.';
