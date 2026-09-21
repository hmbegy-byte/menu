-- Restaurant administrators share organization-level management permissions with owners.
-- The role label remains distinct for auditing, but both roles are authorized equally.

insert into public.organization_members(organization_id,user_id,role)
select distinct s.organization_id,sm.user_id,'admin'
from public.store_members sm
join public.stores s on s.id=sm.store_id
where sm.role='admin' and s.organization_id is not null
on conflict(organization_id,user_id) do update
set role=case
  when public.organization_members.role='owner' then 'owner'
  else 'admin'
end;

create or replace function public.accept_staff_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare inv public.staff_invitations; email text;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select lower(u.email) into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 select * into inv from public.staff_invitations
 where token_hash=encode(digest(p_token,'sha256'),'hex') and status='pending' and expires_at>now()
 for update;
 if not found or email is distinct from lower(inv.email) then
   raise exception 'Invitation unavailable or email does not match';
 end if;
 if not exists(select 1 from public.stores where id=inv.store_id and organization_id=inv.organization_id) then
   raise exception 'Invitation restaurant mismatch';
 end if;
 insert into public.store_members(store_id,user_id,role)
 values(inv.store_id,auth.uid(),inv.role)
 on conflict(store_id,user_id) do update set role=excluded.role;
 if inv.role='admin' then
   insert into public.organization_members(organization_id,user_id,role)
   values(inv.organization_id,auth.uid(),'admin')
   on conflict(organization_id,user_id) do update
   set role=case
     when public.organization_members.role='owner' then 'owner'
     else 'admin'
   end;
 end if;
 update public.staff_invitations set status='accepted',token_hash=null where id=inv.id;
 return jsonb_build_object('role',inv.role,'slug',(select slug from public.stores where id=inv.store_id));
end $$;
revoke all on function public.accept_staff_invitation(text) from public,anon;
grant execute on function public.accept_staff_invitation(text) to authenticated;

create or replace function public.activate_managed_account(p_user uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts; org uuid; org_role text;
begin
 select * into account from public.staff_accounts where user_id=p_user for update;
 if not found or account.disabled then raise exception 'Account unavailable'; end if;
 select organization_id into strict org from public.stores where id=account.store_id;
 insert into public.store_members(store_id,user_id,role)
 values(account.store_id,p_user,account.role)
 on conflict(store_id,user_id) do update set role=excluded.role;
 if account.role='admin' then
   org_role:=case when account.intended_owner then 'owner' else 'admin' end;
   insert into public.organization_members(organization_id,user_id,role)
   values(org,p_user,org_role)
   on conflict(organization_id,user_id) do update
   set role=case
     when public.organization_members.role='owner' then 'owner'
     else excluded.role
   end;
   if account.intended_owner then
     update public.organizations
     set metadata=metadata||'{"setup_pending":false}'::jsonb
     where id=org;
   end if;
 end if;
end $$;

create or replace function public.change_managed_account_role(
  p_user uuid,
  p_store uuid,
  p_role text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts; org uuid; org_role text;
begin
 if p_role not in ('admin','kitchen') then raise exception 'Invalid role'; end if;
 select * into account from public.staff_accounts
 where user_id=p_user and store_id=p_store for update;
 if not found then raise exception 'Account unavailable'; end if;
 select organization_id into strict org from public.stores where id=p_store;

 update public.staff_accounts
 set role=p_role,
     intended_owner=case when p_role='admin' then intended_owner else false end,
     access_revision=access_revision+1
 where user_id=p_user and store_id=p_store;

 if not account.disabled then
   update public.store_members set role=p_role where user_id=p_user and store_id=p_store;
   if p_role='admin' then
     org_role:=case when account.intended_owner then 'owner' else 'admin' end;
     insert into public.organization_members(organization_id,user_id,role)
     values(org,p_user,org_role)
     on conflict(organization_id,user_id) do update
     set role=case
       when public.organization_members.role='owner' then 'owner'
       else excluded.role
     end;
   elsif not exists(
     select 1 from public.store_members sm
     join public.stores s on s.id=sm.store_id
     where sm.user_id=p_user and sm.role='admin' and s.organization_id=org
   ) then
     delete from public.organization_members
     where organization_id=org and user_id=p_user;
   end if;
 end if;
end $$;

create or replace function public.revoke_managed_account(p_user uuid,p_store uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts; org uuid;
begin
 select * into account from public.staff_accounts
 where user_id=p_user and store_id=p_store for update;
 if not found then raise exception 'Account unavailable'; end if;
 select organization_id into strict org from public.stores where id=p_store;
 update public.staff_accounts
 set disabled=true,access_revision=access_revision+1
 where user_id=p_user and store_id=p_store;
 delete from public.store_members where user_id=p_user and store_id=p_store;
 if not exists(
   select 1 from public.store_members sm
   join public.stores s on s.id=sm.store_id
   where sm.user_id=p_user and sm.role='admin' and s.organization_id=org
 ) then
   delete from public.organization_members
   where organization_id=org and user_id=p_user;
 end if;
end $$;

revoke all on function public.activate_managed_account(uuid),
  public.change_managed_account_role(uuid,uuid,text),
  public.revoke_managed_account(uuid,uuid)
from public,anon,authenticated;
grant execute on function public.activate_managed_account(uuid),
  public.change_managed_account_role(uuid,uuid,text),
  public.revoke_managed_account(uuid,uuid)
to service_role;
