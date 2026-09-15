-- Store administrators need entitlements, not organization billing access.
create or replace function public.store_subscription_summary(p_store uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid() is null or not (public.is_platform_admin() or exists(
   select 1 from public.store_members where store_id=p_store and user_id=auth.uid() and role='admin'
 )) then raise exception 'Not authorized'; end if;
 select jsonb_build_object(
   'status',sub.status,'current_period_start',sub.current_period_start,
   'current_period_end',sub.current_period_end,
   'plans',jsonb_build_object('code',p.code,'name',p.name,'features',p.features)
 ) into result from public.stores s join public.subscriptions sub on sub.organization_id=s.organization_id
 join public.plans p on p.id=sub.plan_id where s.id=p_store;
 return result;
end $$;
revoke all on function public.store_subscription_summary(uuid) from public,anon;
grant execute on function public.store_subscription_summary(uuid) to authenticated;
