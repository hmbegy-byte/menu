-- The demo restaurant had an active program but no earning rule, so completed
-- orders could not earn anything. Give it an explicit, owner-editable default.
do $$
declare
  v_org uuid;
  v_store uuid;
  v_rule uuid;
begin
  select id, organization_id into v_store, v_org
  from public.stores where slug = 'demo' limit 1;

  if v_org is null then return; end if;

  select id into v_rule
  from public.loyalty_earning_rules
  where organization_id = v_org and is_active
  order by created_at
  limit 1;

  if v_rule is null then
    insert into public.loyalty_earning_rules(
      organization_id, is_active, rule_type, reward_value, currency_type,
      min_amount, conditions, priority
    ) values (
      v_org, true, 'points_per_currency', 1, 'points', 5,
      jsonb_build_object('title', 'نقطة لكل ريال'), 0
    ) returning id into v_rule;
  end if;

  -- Recover eligible completed orders made after the customer explicitly joined.
  insert into public.loyalty_transactions(
    organization_id, store_id, customer_id, amount, currency_type,
    transaction_type, order_id, reason, idempotency_key
  )
  select
    v_org, o.store_id, c.id, floor(o.total_amount)::integer, 'points',
    'earn', o.id, 'استعادة نقاط طلب مكتمل بعد تفعيل قاعدة الكسب',
    'rule_' || v_rule || '_' || o.id
  from public.orders o
  join public.loyalty_customers c
    on c.organization_id = v_org
   and c.joined_at is not null
   and (public.loyalty_phone_key(c.phone) = public.loyalty_phone_key(o.customer_phone)
     or public.loyalty_phone_key(c.contact_phone) = public.loyalty_phone_key(o.customer_phone))
  join public.loyalty_programs p on p.organization_id = v_org and p.is_active
  where o.store_id = v_store
    and o.status = 'completed'
    and o.created_at >= c.joined_at
    and o.total_amount >= greatest(p.min_order_amount, 5)
    and floor(o.total_amount) > 0
    and not exists (
      select 1 from public.loyalty_transactions t
      where t.idempotency_key = 'rule_' || v_rule || '_' || o.id
    )
    and 1 = (
      select count(*) from public.loyalty_customers unique_customer
      where unique_customer.organization_id = v_org
        and unique_customer.joined_at is not null
        and (public.loyalty_phone_key(unique_customer.phone) = public.loyalty_phone_key(o.customer_phone)
          or public.loyalty_phone_key(unique_customer.contact_phone) = public.loyalty_phone_key(o.customer_phone))
    )
  on conflict (idempotency_key) do nothing;
end $$;
