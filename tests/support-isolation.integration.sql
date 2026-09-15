-- Synthetic fixtures only; caller must wrap this file in BEGIN/ROLLBACK.
do $$
declare
 owner_id uuid:=gen_random_uuid(); platform_id uuid:=gen_random_uuid();
 org_id uuid:=gen_random_uuid(); store_a uuid:=gen_random_uuid(); store_b uuid:=gen_random_uuid();
 ticket uuid; denied boolean;
begin
 insert into auth.users(id,email) values(owner_id,owner_id||'@example.invalid'),(platform_id,platform_id||'@example.invalid');
 insert into public.platform_admins(user_id) values(platform_id);
 insert into public.organizations(id,name) values(org_id,'ROLLBACK SUPPORT');
 insert into public.subscriptions(organization_id,plan_id,status,current_period_end)
 select org_id,id,'active',current_date+10 from public.plans where code='pro';
 insert into public.stores(id,organization_id,name,slug,currency,phone_whatsapp)
 values(store_a,org_id,'ROLLBACK SUPPORT A',store_a::text,'SAR',''),(store_b,org_id,'ROLLBACK SUPPORT B',store_b::text,'SAR','');
 insert into public.store_members(store_id,user_id,role) values(store_a,owner_id,'admin');
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 insert into public.support_tickets(store_id,requester_id,subject,details)
 values(store_a,owner_id,'ROLLBACK issue','Synthetic support details') returning id into ticket;
 if not exists(select 1 from public.support_tickets where id=ticket and status='open' and reference is not null) then raise exception 'FAIL support create/read'; end if;
 update public.support_tickets set status='resolved',resolved_at=now() where id=ticket;
 if exists(select 1 from public.support_tickets where id=ticket and status<>'open') then raise exception 'FAIL restaurant resolves support'; end if;
 denied:=false;
 begin insert into public.support_tickets(store_id,requester_id,subject,details) values(store_b,owner_id,'ROLLBACK issue','Synthetic support details'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL cross-store support create'; end if;
 denied:=false;
 begin insert into public.support_tickets(store_id,requester_id,subject,details) values(store_a,platform_id,'ROLLBACK issue','Synthetic support details'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL forged support requester'; end if;
 execute 'reset role';
 insert into public.support_tickets(store_id,requester_id,subject,details) values(store_b,platform_id,'OTHER STORE issue','Synthetic private support details');
 execute 'set local role authenticated';
 if exists(select 1 from public.support_tickets where store_id=store_b) then raise exception 'FAIL cross-store support read'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',platform_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',platform_id,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 update public.support_tickets set status='resolved',resolved_at=now() where id=ticket;
 if not exists(select 1 from public.support_tickets where id=ticket and status='resolved' and resolved_at is not null) then raise exception 'FAIL platform resolution'; end if;
 denied:=false;
 begin update public.support_tickets set details='Changed requester details' where id=ticket; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL support details immutable'; end if;
 execute 'reset role';
end $$;
