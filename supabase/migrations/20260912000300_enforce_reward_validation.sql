do $$ declare d text; begin
 d:=pg_get_functiondef('public.redeem_loyalty_reward(uuid,uuid,uuid,uuid)'::regprocedure);
 if position('Reward configuration unavailable' in d)=0 then
   if position('select * into customer from public.loyalty_customers' in d)=0 then raise exception 'Unexpected reward function'; end if;
   d:=replace(d,'select * into customer from public.loyalty_customers',
   'if reward.reward_type<>''free_item'' or coalesce(reward.points_cost,0)<0 or coalesce(reward.stamps_cost,0)<0 or coalesce(reward.points_cost,0)+coalesce(reward.stamps_cost,0)<=0 then raise exception ''Reward configuration unavailable''; end if;
   if not exists(select 1 from public.products p join public.stores s on s.id=p.store_id where s.organization_id=org and p.id::text=reward.conditions->>''product_id'') then raise exception ''Reward product unavailable''; end if;
   select * into customer from public.loyalty_customers');
   execute d;
 end if;
end $$;
