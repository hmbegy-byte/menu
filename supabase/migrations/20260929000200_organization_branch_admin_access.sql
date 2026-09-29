-- Owners and organization administrators manage every branch without needing
-- a duplicate store_members row for every newly-created branch.
create or replace function public.is_store_member(
  target_store uuid,
  allowed_roles text[] default array['admin','kitchen']
) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select
    exists(
      select 1 from public.store_members sm
      where sm.store_id=target_store
        and sm.user_id=auth.uid()
        and sm.role=any(allowed_roles)
    )
    or exists(
      select 1
      from public.stores s
      join public.organization_members om on om.organization_id=s.organization_id
      where s.id=target_store
        and om.user_id=auth.uid()
        and (
          (om.role in ('owner','admin') and 'admin'=any(allowed_roles))
          or (om.role='manager' and 'manager'=any(allowed_roles))
          or (om.role='accountant' and 'accountant'=any(allowed_roles))
        )
    );
$$;

revoke all on function public.is_store_member(uuid,text[]) from public,anon;
grant execute on function public.is_store_member(uuid,text[]) to authenticated,service_role;
