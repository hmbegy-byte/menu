-- Replace obsolete write grants instead of relying on another permissive policy.
do $$ declare p record; t text; begin
 foreach t in array array['loyalty_customers','value_wallets','value_ledger','loyalty_transactions','staff_invitations','subscription_addons'] loop
   for p in select policyname from pg_policies where schemaname='public' and tablename=t and cmd in ('ALL','INSERT','UPDATE','DELETE') loop
     execute format('drop policy %I on public.%I',p.policyname,t);
   end loop;
 end loop;
end $$;
revoke insert,update,delete on public.loyalty_customers,public.value_wallets,public.value_ledger,public.loyalty_transactions,public.staff_invitations,public.subscription_addons from anon,authenticated;
create policy "authorized restaurant customer lookup" on public.loyalty_customers for select to authenticated
using(public.can_manage_loyalty(organization_id));
create policy "authorized wallet reading" on public.value_wallets for select to authenticated
using(public.is_org_member(organization_id,array['owner','admin','manager']) or public.is_platform_admin());
create policy "platform addon writes" on public.subscription_addons for all to authenticated
using(public.is_platform_admin()) with check(public.is_platform_admin());
grant insert,update,delete on public.subscription_addons to authenticated;

create unique index if not exists stores_id_org_unique on public.stores(id,organization_id);
alter table public.staff_invitations add constraint invitation_store_organization_fk
 foreign key(store_id,organization_id) references public.stores(id,organization_id) not valid;
-- Existing bad rows cannot be accepted even though the FK is initially NOT VALID.
do $$ declare d text; begin
 d:=pg_get_functiondef('public.accept_staff_invitation(text)'::regprocedure);
 if position('insert into public.store_members' in d)=0 then raise exception 'Unexpected invitation function'; end if;
 d:=replace(d,'insert into public.store_members',
 'if not exists(select 1 from public.stores where id=inv.store_id and organization_id=inv.organization_id) then raise exception ''Invitation restaurant mismatch''; end if;
 insert into public.store_members');
 execute d;
end $$;
create or replace function public.revoke_staff_invitation(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare inv public.staff_invitations;
begin
 select * into inv from public.staff_invitations where id=p_id for update;
 if not found or not exists(select 1 from public.stores where id=inv.store_id and organization_id=inv.organization_id)
 or not public.can_manage_loyalty(inv.organization_id) then raise exception 'Not authorized'; end if;
 if inv.status='pending' then update public.staff_invitations set status='revoked',token_hash=null where id=p_id; end if;
end $$;
revoke all on function public.revoke_staff_invitation(uuid) from public,anon;
grant execute on function public.revoke_staff_invitation(uuid) to authenticated;
-- No reservation endpoint until ownership, expiry and release are implemented.
revoke all on function public.reserve_limited_offer(uuid,integer) from public,anon,authenticated;

-- Ledger calls reject key reuse with a different payload, rather than silently succeeding.
create or replace function public.apply_wallet_entry(p_wallet_id uuid,p_amount numeric,p_type text,p_reason text,p_idempotency text)
returns numeric language plpgsql security definer set search_path=public,pg_temp as $$
declare b numeric; org uuid; old_entry public.value_ledger;
begin
 if auth.uid() is null or p_amount is null or p_amount=0 or p_type not in ('earn','redeem','expire','reverse','refund','adjust')
 or nullif(trim(p_reason),'') is null or nullif(trim(p_idempotency),'') is null then raise exception 'Invalid wallet entry'; end if;
 select balance,organization_id into b,org from public.value_wallets where id=p_wallet_id for update;
 if not found or not(public.is_org_member(org,array['owner','admin','manager']) or public.is_platform_admin()) then raise exception 'Not authorized'; end if;
 perform pg_advisory_xact_lock(hashtext(p_idempotency));
 select * into old_entry from public.value_ledger where idempotency_key=p_idempotency;
 if found then
   if old_entry.wallet_id<>p_wallet_id or old_entry.amount<>p_amount or old_entry.entry_type<>p_type or old_entry.reason is distinct from trim(p_reason) then raise exception 'Idempotency conflict'; end if;
   return b;
 end if;
 if b+p_amount<0 then raise exception 'Insufficient wallet balance'; end if;
 insert into public.value_ledger(wallet_id,amount,entry_type,reason,idempotency_key) values(p_wallet_id,p_amount,p_type,trim(p_reason),p_idempotency);
 update public.value_wallets set balance=balance+p_amount where id=p_wallet_id returning balance into b;
 return b;
end $$;
