-- Legacy checkout flows could leave a phone-only shadow record next to the
-- customer's enrolled membership. Award only the explicit, joined membership.
create or replace function public.process_order_loyalty() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare org uuid; customer uuid; program public.loyalty_programs; rule public.loyalty_earning_rules;
 qty numeric; award integer; prior record; phone_key text;
begin
 if old.status=new.status or new.status not in ('completed','cancelled') then return new; end if;
 select organization_id into org from public.stores where id=new.store_id;
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
 if (select count(*) from public.loyalty_customers where organization_id=org
   and joined_at is not null
   and (public.loyalty_phone_key(phone)=phone_key or public.loyalty_phone_key(contact_phone)=phone_key))<>1 then return new; end if;
 select id into customer from public.loyalty_customers where organization_id=org
   and joined_at is not null
   and (public.loyalty_phone_key(phone)=phone_key or public.loyalty_phone_key(contact_phone)=phone_key) for update;
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
