-- Return an entitlement decision, never billing data. Store staff need not be
-- organization administrators to use their assigned kitchen.
create or replace function public.check_kitchen_access(p_store_id uuid)
returns text
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_features jsonb;
begin
  if auth.uid() is null then return 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.store_members
    where store_id = p_store_id and user_id = auth.uid()
      and role in ('admin', 'kitchen')
  ) then return 'ACCESS_DENIED'; end if;

  select sub.status, plan.features into v_status, v_features
  from public.stores s
  join public.subscriptions sub on sub.organization_id = s.organization_id
  join public.plans plan on plan.id = sub.plan_id
  where s.id = p_store_id;
  if not found then return 'SUBSCRIPTION_MISSING'; end if;
  if v_status not in ('active', 'trial') then return 'SUBSCRIPTION_INACTIVE'; end if;
  if not coalesce(v_features @> '["kitchen"]'::jsonb, false) then
    return 'KITCHEN_NOT_INCLUDED';
  end if;
  return 'ALLOWED';
end;
$$;
revoke all on function public.check_kitchen_access(uuid) from public, anon;
grant execute on function public.check_kitchen_access(uuid) to authenticated;
