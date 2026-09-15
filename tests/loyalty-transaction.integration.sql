-- Execute with Supabase db query --linked --file. No fixture is committed.
begin;
set local statement_timeout='20s';
do $$
declare
 s uuid := gen_random_uuid();
 org uuid:=gen_random_uuid(); worker uuid:=gen_random_uuid(); customer uuid:=gen_random_uuid(); reward uuid:=gen_random_uuid();
 product uuid:=gen_random_uuid(); plan uuid; result record; balance integer; stamp_balance integer;
 request uuid:=gen_random_uuid(); denied boolean:=false; affected integer;
begin
 insert into auth.users(id,email,email_confirmed_at) values(worker,worker||'@example.invalid',now());
 insert into public.organizations(id,name) values(org,'LOYALTY TEST ROLLBACK');
 select id into strict plan from public.plans where code='pro';
 insert into public.subscriptions(organization_id,plan_id,status,current_period_end) values(org,plan,'active',current_date+10);
 insert into public.stores(id,organization_id,name,slug,currency,phone_whatsapp) values(s,org,'LOYALTY TEST ROLLBACK',s::text,'SAR','');
 insert into public.store_members(store_id,user_id,role) values(s,worker,'kitchen');
 insert into public.products(id,store_id,name,price,is_available,options) values(product,s,'LOYALTY TEST PRODUCT',10,true,'[]'::jsonb);
 insert into public.loyalty_programs(organization_id,is_active,program_type,min_order_amount,allow_staff_adjustments)
 values(org,true,'hybrid',0,false);
 update public.loyalty_earning_rules set is_active=false where organization_id=org;
 insert into public.loyalty_customers(id,organization_id,phone,name)
 values(customer,org,'+12025550198','TEST ROLLBACK ONLY');
 insert into public.loyalty_earning_rules(organization_id,rule_type,currency_type,reward_value)
 values(org,'fixed_per_order','points',20),(org,'fixed_per_order','stamps',2);
 insert into public.loyalty_rewards(id,organization_id,reward_type,reward_value,points_cost,stamps_cost,conditions)
 values(reward,org,'free_item',1,5,1,jsonb_build_object('title','TEST ROLLBACK ONLY','product_id',product));
 select * into result from public.create_order_v4(s,'TEST ROLLBACK ONLY','+12025550198','pickup',null,'TEST ROLLBACK ONLY','cash',jsonb_build_array(jsonb_build_object('product_id',product,'quantity',1,'selected_options','[]'::jsonb)),null,null,gen_random_uuid());
 update public.orders set status='completed' where id=result.id;
 select points_balance,stamps_balance into balance,stamp_balance from public.loyalty_customers where id=customer;
 if balance<>20 or stamp_balance<>2 then raise exception 'FAIL earning: % points % stamps',balance,stamp_balance; end if;
 update public.orders set status='completed' where id=result.id;
 if (select points_balance from public.loyalty_customers where id=customer)<>20 then raise exception 'FAIL duplicate earning'; end if;
 perform set_config('request.jwt.claim.sub',worker::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',worker,'role','authenticated')::text,true);
 if (select count(*) from public.staff_loyalty_lookup(s,'+12025550198'))<>1 then raise exception 'FAIL lookup'; end if;
 begin
   perform public.adjust_loyalty_balance(s,customer,100,'points','test');
 exception when others then
   if sqlerrm='Manual adjustments disabled by owner' then denied:=true; else raise; end if;
 end;
 if not denied then raise exception 'FAIL manual permission'; end if;
 perform public.redeem_loyalty_reward(s,customer,reward,request);
 perform public.redeem_loyalty_reward(s,customer,reward,request);
 select points_balance,stamps_balance into balance,stamp_balance from public.loyalty_customers where id=customer;
 if balance<>15 or stamp_balance<>1 then raise exception 'FAIL redemption/idempotency: % %',balance,stamp_balance; end if;
 denied:=false;
 begin
   perform public.redeem_loyalty_reward(gen_random_uuid(),customer,reward,gen_random_uuid());
 exception when others then if sqlerrm='Not authorized' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL cross-store'; end if;
 update public.loyalty_rewards set points_cost=999 where id=reward;
 denied:=false;
 begin
   perform public.redeem_loyalty_reward(s,customer,reward,gen_random_uuid());
 exception when others then if sqlerrm='Insufficient balance' then denied:=true; else raise; end if; end;
 if not denied then raise exception 'FAIL insufficient balance'; end if;
 update public.orders set status='cancelled' where id=result.id;
 select points_balance,stamps_balance into balance,stamp_balance from public.loyalty_customers where id=customer;
 if balance<>0 or stamp_balance<>0 then raise exception 'FAIL reversal'; end if;
 execute 'set local role authenticated';
 if exists(select 1 from public.loyalty_customers where id=customer) then raise exception 'FAIL unrestricted customer read'; end if;
 update public.loyalty_programs set min_order_amount=123 where organization_id=org;
 get diagnostics affected = row_count;
 if affected<>0 then raise exception 'FAIL kitchen can edit program'; end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: earning, duplicate earning, lookup, manual permission, redemption, duplicate redemption, cross-store denial, insufficient balance, cancellation, customer RLS, settings RLS; fixtures rolled back' as result;
