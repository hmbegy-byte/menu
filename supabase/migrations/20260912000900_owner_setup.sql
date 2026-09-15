alter table public.staff_accounts add column intended_owner boolean not null default false;
alter table public.staff_accounts add column access_revision bigint not null default 0;
create or replace function public.activate_managed_account(p_user uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts; org uuid;
begin
 select * into account from public.staff_accounts where user_id=p_user for update;
 if not found or account.disabled then raise exception 'Account unavailable'; end if;
 select organization_id into strict org from public.stores where id=account.store_id;
 insert into public.store_members(store_id,user_id,role) values(account.store_id,p_user,account.role)
 on conflict(store_id,user_id) do update set role=excluded.role;
 if account.intended_owner then
   if account.role<>'admin' then raise exception 'Owner must be administrator'; end if;
   insert into public.organization_members(organization_id,user_id,role) values(org,p_user,'owner')
   on conflict(organization_id,user_id) do update set role='owner';
   update public.organizations set metadata=metadata||'{"setup_pending":false}'::jsonb where id=org;
 end if;
end $$;
create or replace function public.revoke_managed_account(p_user uuid,p_store uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts;
begin
 select * into account from public.staff_accounts where user_id=p_user and store_id=p_store for update;
 if not found then raise exception 'Account unavailable'; end if;
 update public.staff_accounts set disabled=true,access_revision=access_revision+1 where user_id=p_user;
 delete from public.store_members where user_id=p_user and store_id=p_store;
 if account.intended_owner then
   delete from public.organization_members where user_id=p_user and organization_id=(select organization_id from public.stores where id=p_store);
 end if;
end $$;
revoke all on function public.activate_managed_account(uuid),public.revoke_managed_account(uuid,uuid) from public,anon,authenticated;
grant execute on function public.activate_managed_account(uuid),public.revoke_managed_account(uuid,uuid) to service_role;

-- A delayed Auth reset must never undo a newer disable or reset request.
create function public.begin_managed_account_reset(p_user uuid,p_store uuid) returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare revision bigint;
begin
 perform public.revoke_managed_account(p_user,p_store);
 select access_revision into strict revision from public.staff_accounts where user_id=p_user and store_id=p_store;
 return revision;
end $$;
create function public.finish_managed_account_reset(p_user uuid,p_store uuid,p_revision bigint) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.staff_accounts set disabled=false
 where user_id=p_user and store_id=p_store and disabled and access_revision=p_revision;
 return found;
end $$;
revoke all on function public.begin_managed_account_reset(uuid,uuid),public.finish_managed_account_reset(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.begin_managed_account_reset(uuid,uuid),public.finish_managed_account_reset(uuid,uuid,bigint) to service_role;

-- Bind activation to the account version read before the external Auth call.
create function public.activate_managed_account_revision(p_user uuid,p_revision bigint) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare account public.staff_accounts;
begin
 select * into account from public.staff_accounts where user_id=p_user for update;
 if not found or account.disabled or account.access_revision is distinct from p_revision then
   raise exception 'Account unavailable';
 end if;
 perform public.activate_managed_account(p_user);
end $$;
revoke all on function public.activate_managed_account_revision(uuid,bigint) from public,anon,authenticated;
grant execute on function public.activate_managed_account_revision(uuid,bigint) to service_role;
