drop policy if exists plan_public_offers on public.offers;
drop policy if exists plan_public_banners on public.banners;
create policy plan_public_offers on public.offers as restrictive for select using (public.store_has_feature(store_id,'coupons') or public.is_platform_admin());
create policy plan_public_banners on public.banners as restrictive for select using (public.store_has_feature(store_id,'coupons') or public.is_platform_admin());
create or replace function public.effective_product_price(p_id uuid) returns numeric language sql stable security definer set search_path=public as $$
 select round(p.price*(100-coalesce((select max(o.discount_percentage) from public.offers o where public.store_has_feature(p.store_id,'coupons') and o.store_id=p.store_id and o.active and (o.product_id is null or o.product_id=p.id)),0))/100,2) from public.products p where p.id=p_id;
$$;
