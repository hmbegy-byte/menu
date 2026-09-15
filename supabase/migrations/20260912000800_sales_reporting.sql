-- Historical discount amounts were not captured: NULL is unknown, never a fabricated zero.
alter table public.orders add column discount_amount numeric(12,2);
create or replace function public.capture_order_discount() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare discount numeric;
begin
 select greatest(price-public.effective_product_price(id),0)*new.quantity into discount from public.products where id=new.product_id;
 update public.orders set discount_amount=coalesce(discount_amount,0)+coalesce(discount,0) where id=new.order_id;
 return new;
end $$;
create trigger order_discount_snapshot after insert on public.order_items for each row execute function public.capture_order_discount();

create or replace function public.restaurant_sales_report(p_store uuid,p_from timestamptz,p_to timestamptz,p_search text default '',p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if not (public.is_store_member(p_store,array['admin','manager','accountant']) or public.is_platform_admin()) then raise exception 'Not authorized'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_offset is null or p_offset<0 then raise exception 'Invalid report range'; end if;
 with scope as (
   select *,greatest(total_amount-greatest(coalesce(refunded_amount,0),0),0) as net
   from public.orders where store_id=p_store and created_at>=p_from and created_at<p_to
 ), completed as (select * from scope where status='completed'),
 customers as (
   select public.loyalty_phone_key(customer_phone) as phone,(array_agg(customer_name order by created_at desc))[1] as name,
   count(*) as orders,sum(net) as spent,max(created_at) as last_order from completed group by public.loyalty_phone_key(customer_phone)
 ), filtered as (select * from customers where name ilike '%'||coalesce(p_search,'')||'%' or phone ilike '%'||coalesce(p_search,'')||'%'),
 products as (
   select i.product_id,i.product_name,sum(i.quantity) as quantity from public.order_items i join completed o on o.id=i.order_id
   where o.net>0 group by i.product_id,i.product_name order by sum(i.quantity) desc,i.product_name limit 10
 )
 select jsonb_build_object(
   'completed_orders',(select count(*) from completed),
   'pending_orders',(select count(*) from scope where status in ('pending','preparing','ready')),
   'cancelled_orders',(select count(*) from scope where status='cancelled'),
   'gross_known',(select coalesce(sum(total_amount+discount_amount),0) from completed where discount_amount is not null),
   'unknown_discount_orders',(select count(*) from completed where discount_amount is null),
   'discounts_known',(select coalesce(sum(discount_amount),0) from completed),
   'refunds',(select coalesce(sum(least(total_amount,greatest(coalesce(refunded_amount,0),0))),0) from completed),
   'net_sales',(select coalesce(sum(net),0) from completed),
   'average_order',(select coalesce(avg(net),0) from completed),
   'customer_count',(select count(*) from filtered),
   'customers',coalesce((select jsonb_agg(c) from (select * from filtered order by spent desc,phone limit 50 offset p_offset)c),'[]'::jsonb),
   'products',coalesce((select jsonb_agg(p) from products p),'[]'::jsonb)
 ) into result;
 return result;
end $$;
revoke all on function public.restaurant_sales_report(uuid,timestamptz,timestamptz,text,integer) from public,anon;
grant execute on function public.restaurant_sales_report(uuid,timestamptz,timestamptz,text,integer) to authenticated;

-- Campaign attribution follows the same completed-order sales basis as the main report.
create or replace function public.campaign_metrics(p_store_id uuid,p_from timestamptz,p_to timestamptz)
returns table(campaign_id uuid,name text,source text,orders_count bigint,net_sales numeric,average_order_value numeric)
language sql stable security definer set search_path=public,pg_temp as $$
 select c.id,c.name,c.source,
 count(o.id) filter(where o.status='completed'),
 coalesce(sum(greatest(o.total_amount-greatest(coalesce(o.refunded_amount,0),0),0)) filter(where o.status='completed'),0),
 coalesce(avg(greatest(o.total_amount-greatest(coalesce(o.refunded_amount,0),0),0)) filter(where o.status='completed'),0)
 from public.campaigns c left join public.campaign_conversions cc on cc.campaign_id=c.id
 left join public.orders o on o.id=cc.order_id and o.store_id=c.store_id and o.created_at>=p_from and o.created_at<p_to
 where c.store_id=p_store_id and (public.is_store_member(p_store_id,array['admin','manager','accountant']) or public.is_platform_admin())
 group by c.id,c.name,c.source order by 5 desc;
$$;
revoke all on function public.campaign_metrics(uuid,timestamptz,timestamptz) from public,anon;
grant execute on function public.campaign_metrics(uuid,timestamptz,timestamptz) to authenticated;
