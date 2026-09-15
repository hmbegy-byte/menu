-- Synthetic fixtures only; caller must apply the operations migration first and
-- wrap this file in BEGIN/ROLLBACK.
do $$
declare
  actor uuid:=gen_random_uuid(); org uuid:=gen_random_uuid(); store_a uuid:=gen_random_uuid(); store_b uuid:=gen_random_uuid();
  product_a uuid:=gen_random_uuid(); item_a uuid:=gen_random_uuid(); order_a uuid:=gen_random_uuid(); order_cancel uuid:=gen_random_uuid(); board_token uuid;
  expense_a uuid; expense_deleted uuid; command_a uuid:=gen_random_uuid(); denied boolean:=false; first_stock numeric; report jsonb; tracked record;
begin
  insert into auth.users(id,email) values(actor,actor||'@example.invalid');
  insert into public.organizations(id,name) values(org,'ROLLBACK OPERATIONS');
  insert into public.subscriptions(organization_id,plan_id,status,current_period_end)
  select org,id,'active',current_date+10 from public.plans where code='pro';
  insert into public.stores(id,organization_id,name,slug,currency,phone_whatsapp,settings)
  values
    (store_a,org,'ROLLBACK A',store_a::text,'SAR','',jsonb_build_object('inventoryEnabled',true,'curbsideEnabled',true,'googleReviewEnabled',true,'googleReviewUrl','https://g.page/example/review','defaultPaymentFee',1,'defaultCommissionPercent',2,'defaultDeliveryFulfillmentCost',0)),
    (store_b,org,'ROLLBACK B',store_b::text,'SAR','',jsonb_build_object('inventoryEnabled',true));
  insert into public.store_members(store_id,user_id,role) values(store_a,actor,'admin');
  insert into public.products(id,store_id,name,price) values(product_a,store_a,'ROLLBACK PRODUCT',100);
  insert into public.product_costs(product_id,ingredient_cost,packaging_cost) values(product_a,0,2);
  insert into public.inventory_items(id,store_id,name,unit,on_hand,reorder_level,unit_cost) values(item_a,store_a,'ROLLBACK ITEM','جرام',10,2,3);
  insert into public.recipe_components(product_id,inventory_item_id,quantity,unit) values(product_a,item_a,2,'جرام');
  insert into public.orders(id,store_id,customer_name,customer_phone,order_type,pickup_method,car_description,payment_method,subtotal_amount,tax_amount,total_amount,status,discount_amount,tracking_token)
  values(order_a,store_a,'PRIVATE NAME','0500000000','pickup','curbside','WHITE CAR','cash',100,15,115,'pending',5,gen_random_uuid()),
    (order_cancel,store_a,'PRIVATE CANCEL','0500000001','pickup','counter',null,'cash',100,15,115,'pending',0,gen_random_uuid());
  insert into public.order_items(order_id,product_id,product_name,unit_price,quantity) values(order_a,product_a,'ROLLBACK PRODUCT',100,1),(order_cancel,product_a,'ROLLBACK PRODUCT',100,1);

  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';

  insert into public.order_display_boards(store_id) values(store_a) returning access_token into board_token;
  if exists(select 1 from public.order_board_snapshot(board_token) where order_number is null) then raise exception 'FAIL invalid board projection'; end if;
  insert into public.expenses(store_id,category,amount,description,reporting_scope) values(store_a,'مواد',20,'ROLLBACK', 'store_only') returning id into expense_a;
  insert into public.expenses(store_id,category,amount,description,reporting_scope) values(store_a,'إدارة',99,'ROLLBACK SHARED','organization_shared');
  insert into public.expenses(store_id,category,amount,description,reporting_scope) values(store_a,'مؤقت',5,'ROLLBACK DELETE','store_only') returning id into expense_deleted;
  update public.expenses set amount=21 where id=expense_a;
  delete from public.expenses where id=expense_deleted;
  if not exists(select 1 from public.expense_audit_log where expense_id=expense_a and action='insert') then raise exception 'FAIL expense audit'; end if;
  if not exists(select 1 from public.expense_audit_log where expense_id=expense_a and action='update') or not exists(select 1 from public.expense_audit_log where expense_id=expense_deleted and action='delete') then raise exception 'FAIL expense update/delete audit'; end if;
  begin insert into public.expenses(store_id,category,amount) values(store_b,'FORBIDDEN',10); exception when others then denied:=true; end;
  if not denied then raise exception 'FAIL expense tenant isolation'; end if;

  if public.kitchen_set_status(store_a,order_a,'pending','preparing',command_a)<>'APPLIED' then raise exception 'FAIL prepare'; end if;
  if (select count(*) from public.order_board_snapshot(board_token))<>1 then raise exception 'FAIL order board snapshot'; end if;
  select on_hand into first_stock from public.inventory_items where id=item_a;
  if first_stock<>8 then raise exception 'FAIL recipe deduction: %',first_stock; end if;
  if public.kitchen_set_status(store_a,order_a,'pending','preparing',command_a)<>'APPLIED' then raise exception 'FAIL retry result'; end if;
  if (select on_hand from public.inventory_items where id=item_a)<>8 or (select count(*) from public.inventory_movements where order_id=order_a)<>1 then raise exception 'FAIL duplicate deduction'; end if;
  if public.kitchen_set_status(store_a,order_cancel,'pending','preparing',gen_random_uuid())<>'APPLIED' or public.kitchen_set_status(store_a,order_cancel,'preparing','cancelled',gen_random_uuid())<>'APPLIED' then raise exception 'FAIL cancellation flow'; end if;
  if (select on_hand from public.inventory_items where id=item_a)<>6 then raise exception 'FAIL cancellation restored consumed stock'; end if;
  if public.customer_curbside_arrived((select tracking_token from public.orders where id=order_a))<>'CREATED' then raise exception 'FAIL curbside arrival'; end if;
  if public.customer_curbside_arrived((select tracking_token from public.orders where id=order_a))<>'ALREADY_RECORDED' then raise exception 'FAIL curbside idempotency'; end if;
  if not public.acknowledge_curbside_arrival(store_a,order_a) then raise exception 'FAIL curbside acknowledge'; end if;
  if public.kitchen_set_status(store_a,order_a,'preparing','ready',gen_random_uuid())<>'APPLIED' then raise exception 'FAIL ready'; end if;
  if public.kitchen_set_status(store_a,order_a,'ready','completed',gen_random_uuid())<>'APPLIED' then raise exception 'FAIL completed'; end if;
  update public.inventory_items set unit_cost=30 where id=item_a;
  if (select product_cost from public.order_costs where order_id=order_a)<>6 then raise exception 'FAIL immutable cost snapshot'; end if;
  select public.restaurant_profitability_report(store_a,now()-interval '1 day',now()+interval '1 day') into report;
  if (report->>'recorded_expenses')::numeric<>21 then raise exception 'FAIL shared expense counted: %',report; end if;
  select * into tracked from public.track_order((select tracking_token from public.orders where id=order_a));
  if tracked.google_review_url is null or tracked.curbside_acknowledged_at is null then raise exception 'FAIL completed tracking additions'; end if;
  execute 'reset role';
end $$;
