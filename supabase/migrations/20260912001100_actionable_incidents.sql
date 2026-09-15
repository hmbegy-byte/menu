create or replace function public.report_store_incident(p_store_id uuid,p_source text,p_severity text,p_title text,p_details text default null)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid;
begin
 if not public.is_store_member(p_store_id,array['admin','manager','kitchen']) and not public.is_platform_admin() then raise exception 'Not authorized'; end if;
 select organization_id into strict org from public.stores where id=p_store_id;
 if nullif(trim(p_source),'') is null or nullif(trim(p_title),'') is null then raise exception 'Incident details required'; end if;
 perform pg_advisory_xact_lock(hashtext(p_store_id::text||p_source));
 if not exists(select 1 from public.system_incidents where store_id=p_store_id and source=p_source and resolved_at is null) then
   insert into public.system_incidents(organization_id,store_id,source,severity,title,details)
   values(org,p_store_id,left(p_source,100),case when p_severity in ('info','warning','critical') then p_severity else 'warning' end,left(p_title,150),left(p_details,1000));
 end if;
end $$;
create or replace function public.refresh_subscription_incident(p_store uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare sub public.subscriptions;
begin
 if not public.is_store_member(p_store,array['admin','manager']) and not public.is_platform_admin() then raise exception 'Not authorized'; end if;
 select s.* into sub from public.subscriptions s join public.stores st on st.organization_id=s.organization_id where st.id=p_store;
 if not found or sub.current_period_end is null or sub.current_period_end<=current_date+7 or sub.status not in ('active','trial') then
   perform public.report_store_incident(p_store,'subscription_expiry','warning','راجع حالة الاشتراك وموعد انتهائه','راجع صفحة الباقة وتواصل مع مالك المنصة لتأكيد التجديد. لا ترسل دفعات دون اتفاق.');
 else
   update public.system_incidents set resolved_at=now() where store_id=p_store and source='subscription_expiry' and resolved_at is null;
 end if;
end $$;
revoke all on function public.refresh_subscription_incident(uuid) from public,anon;
grant execute on function public.refresh_subscription_incident(uuid) to authenticated;
