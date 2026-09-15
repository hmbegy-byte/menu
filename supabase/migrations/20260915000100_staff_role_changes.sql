create or replace function public.change_managed_account_role(
  p_user uuid,
  p_store uuid,
  p_role text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  account public.staff_accounts;
  org uuid;
begin
  if p_role not in ('admin','kitchen') then
    raise exception 'Invalid role';
  end if;
  select * into account
  from public.staff_accounts
  where user_id=p_user and store_id=p_store
  for update;
  if not found then raise exception 'Account unavailable'; end if;

  select organization_id into strict org from public.stores where id=p_store;
  if account.intended_owner and p_role<>'admin' then
    delete from public.organization_members
    where organization_id=org and user_id=p_user;
  end if;

  update public.staff_accounts
  set role=p_role,
      intended_owner=case when p_role='admin' then intended_owner else false end,
      access_revision=access_revision+1
  where user_id=p_user and store_id=p_store;

  if not account.disabled then
    update public.store_members
    set role=p_role
    where user_id=p_user and store_id=p_store;
  end if;
end $$;

revoke all on function public.change_managed_account_role(uuid,uuid,text)
from public,anon,authenticated;
grant execute on function public.change_managed_account_role(uuid,uuid,text)
to service_role;
