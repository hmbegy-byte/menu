alter table public.loyalty_programs add column allow_staff_adjustments boolean not null default false;

create or replace function public.can_manage_loyalty(p_org uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.is_platform_admin() or public.is_org_member(p_org,array['owner','admin']) or exists(
 select 1 from public.store_members m join public.stores s on s.id=m.store_id
 where s.organization_id=p_org and m.user_id=auth.uid() and m.role='admin');
$$;
create policy "restaurant admins manage loyalty settings" on public.loyalty_programs for all to authenticated using(public.can_manage_loyalty(organization_id)) with check(public.can_manage_loyalty(organization_id));
create policy "restaurant admins manage loyalty rules" on public.loyalty_earning_rules for all to authenticated using(public.can_manage_loyalty(organization_id)) with check(public.can_manage_loyalty(organization_id));
create policy "restaurant admins manage loyalty rewards" on public.loyalty_rewards for all to authenticated using(public.can_manage_loyalty(organization_id)) with check(public.can_manage_loyalty(organization_id));

-- Only the owner decides whether staff may make arbitrary balance adjustments.
do $$ declare d text; begin
 d:=pg_get_functiondef('public.adjust_loyalty_balance(uuid,uuid,integer,text,text)'::regprocedure);
 d:=replace(d,'  select c.points_balance,c.stamps_balance into v_points,v_stamps',
 '  if not public.can_manage_loyalty(v_org_id) and not exists(select 1 from public.loyalty_programs where organization_id=v_org_id and is_active and allow_staff_adjustments) then raise exception ''Manual adjustments disabled by owner''; end if;
  select c.points_balance,c.stamps_balance into v_points,v_stamps');
 execute d;
end $$;

create or replace function public.loyalty_phone_key(p text) returns text
language sql immutable set search_path=public,pg_temp as $$
 select case when v ~ '^05[0-9]{8}$' then '+966'||substr(v,2)
 when v ~ '^5[0-9]{8}$' then '+966'||v
 when v ~ '^9665[0-9]{8}$' then '+'||v
 when v like '00%' then '+'||substr(v,3) else v end
 from (select regexp_replace(p,'[^0-9+]','','g') v) n;
$$;

create or replace function public.process_order_loyalty() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid; customer uuid; program public.loyalty_programs; rule public.loyalty_earning_rules;
 qty numeric; award integer; prior record; phone_key text;
begin
 if old.status=new.status or new.status not in ('completed','cancelled') then return new; end if;
 select organization_id into org from public.stores where id=new.store_id;
 -- Reverse actual credits independently of current program/rule settings.
 if new.status='cancelled' then
   for prior in select * from public.loyalty_transactions where order_id=new.id and transaction_type='earn' loop
     perform 1 from public.loyalty_customers where id=prior.customer_id for update;
     select least(prior.amount,case when prior.currency_type='points' then points_balance else stamps_balance end) into award from public.loyalty_customers where id=prior.customer_id;
     insert into public.loyalty_transactions(organization_id,store_id,customer_id,amount,currency_type,transaction_type,order_id,reason,idempotency_key)
     values(org,new.store_id,prior.customer_id,-award,prior.currency_type,'reverse',new.id,'إلغاء الطلب — استرداد الرصيد المتاح','reverse_tx_'||prior.id) on conflict(idempotency_key) do nothing;
   end loop;
   return new;
 end if;
 select * into program from public.loyalty_programs where organization_id=org and is_active;
 if not found or new.total_amount<program.min_order_amount then return new; end if;
 phone_key:=public.loyalty_phone_key(new.customer_phone);
 -- Credit enrolled customers only, never create an unconsented shadow account.
 if (select count(*) from public.loyalty_customers where organization_id=org and
 (public.loyalty_phone_key(phone)=phone_key or public.loyalty_phone_key(contact_phone)=phone_key))<>1 then return new; end if;
 select id into customer from public.loyalty_customers where organization_id=org and
 (public.loyalty_phone_key(phone)=phone_key or public.loyalty_phone_key(contact_phone)=phone_key) for update;
 for rule in select * from public.loyalty_earning_rules where organization_id=org and is_active
 and (valid_from is null or valid_from<=now()) and (valid_until is null or valid_until>now())
 and coalesce(min_amount,0)<=new.total_amount order by priority desc loop
   if program.program_type<>'hybrid' and rule.currency_type<>program.program_type then continue; end if;
   qty:=0;
   if rule.rule_type='points_per_currency' then qty:=new.total_amount;
   elsif rule.rule_type in ('fixed_per_order','fixed_over_amount') then qty:=1;
   elsif rule.rule_type in ('stamps_for_items','multiplier_for_items') then
     select coalesce(sum(quantity),0) into qty from public.order_items where order_id=new.id
       and product_id::text=rule.conditions->>'product_id';
   else continue; end if;
   award:=floor(qty*rule.reward_value);
   if rule.max_per_day is not null then
     select greatest(0,least(award,rule.max_per_day-coalesce(sum(amount),0))) into award
     from public.loyalty_transactions where customer_id=customer and transaction_type='earn'
     and idempotency_key like 'rule_'||rule.id||'_%' and created_at>=date_trunc('day',now());
   end if;
   if award>0 then
     insert into public.loyalty_transactions(organization_id,store_id,customer_id,amount,currency_type,transaction_type,order_id,idempotency_key)
     values(org,new.store_id,customer,award,rule.currency_type,'earn',new.id,'rule_'||rule.id||'_'||new.id) on conflict(idempotency_key) do nothing;
   end if;
 end loop;
 return new;
end $$;

alter table public.loyalty_redemptions add column request_key uuid unique;
alter table public.loyalty_redemptions add column staff_id uuid references auth.users(id);
alter table public.loyalty_redemptions add column reward_snapshot jsonb;
create or replace function public.redeem_loyalty_reward(p_store_id uuid,p_customer_id uuid,p_reward_id uuid,p_request_key uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid; reward public.loyalty_rewards; customer public.loyalty_customers; redemption uuid; existing public.loyalty_redemptions;
begin
 if auth.uid() is null or p_request_key is null or not exists(select 1 from public.store_members where store_id=p_store_id and user_id=auth.uid() and role in ('admin','kitchen','manager','cashier')) then raise exception 'Not authorized'; end if;
 select organization_id into org from public.stores where id=p_store_id;
 perform pg_advisory_xact_lock(hashtext(p_request_key::text));
 select * into existing from public.loyalty_redemptions where request_key=p_request_key;
 if found then
   if existing.store_id<>p_store_id or existing.customer_id<>p_customer_id or existing.reward_id<>p_reward_id then raise exception 'Request conflict'; end if;
   return jsonb_build_object('id',existing.id);
 end if;
 if not exists(select 1 from public.loyalty_programs where organization_id=org and is_active) then raise exception 'Program inactive'; end if;
 select * into reward from public.loyalty_rewards where id=p_reward_id and organization_id=org and is_active
 and (valid_from is null or valid_from<=now()) and (valid_until is null or valid_until>now()) for share;
 if not found then raise exception 'Reward unavailable'; end if;
 select * into customer from public.loyalty_customers where id=p_customer_id and organization_id=org for update;
 if not found then raise exception 'Customer unavailable'; end if;
 if customer.points_balance<coalesce(reward.points_cost,0) or customer.stamps_balance<coalesce(reward.stamps_cost,0) then raise exception 'Insufficient balance'; end if;
 insert into public.loyalty_redemptions(organization_id,store_id,customer_id,reward_id,request_key,staff_id,reward_snapshot)
 values(org,p_store_id,p_customer_id,p_reward_id,p_request_key,auth.uid(),to_jsonb(reward)) returning id into redemption;
 if reward.points_cost>0 then
 insert into public.loyalty_transactions(organization_id,store_id,customer_id,amount,currency_type,transaction_type,staff_id,idempotency_key,reason)
 values(org,p_store_id,p_customer_id,-reward.points_cost,'points','redeem',auth.uid(),'redeem_points_'||redemption,'تسليم مكافأة لدى المطعم'); end if;
 if reward.stamps_cost>0 then
 insert into public.loyalty_transactions(organization_id,store_id,customer_id,amount,currency_type,transaction_type,staff_id,idempotency_key,reason)
 values(org,p_store_id,p_customer_id,-reward.stamps_cost,'stamps','redeem',auth.uid(),'redeem_stamps_'||redemption,'تسليم مكافأة لدى المطعم'); end if;
 return jsonb_build_object('id',redemption);
end $$;
revoke all on function public.redeem_loyalty_reward(uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.redeem_loyalty_reward(uuid,uuid,uuid,uuid) to authenticated;
