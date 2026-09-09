alter table public.offers add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.banners add column if not exists product_id uuid references public.products(id) on delete set null;
create or replace function public.offer_product_scope() returns trigger language plpgsql set search_path=public as $$
begin
 if new.product_id is not null and not exists(select 1 from public.products where id=new.product_id and store_id=new.store_id) then raise exception 'Product belongs to another store'; end if;
 return new;
end $$;

create or replace function public.hours_open(p_hours jsonb,p_timezone text) returns boolean language plpgsql stable set search_path=public as $$
declare local_now timestamp:=now() at time zone p_timezone; d integer:=extract(dow from local_now); m integer:=extract(hour from local_now)*60+extract(minute from local_now); h jsonb; f integer; t integer; day_id integer;
begin
 if jsonb_array_length(coalesce(p_hours,'[]'))=0 then return true; end if;
 for h in select value from jsonb_array_elements(p_hours) loop
  if not coalesce((h->>'isOpen')::boolean,false) then continue; end if;
  day_id:=(h->>'id')::integer;
  f:=split_part(h->>'from',':',1)::integer*60+split_part(h->>'from',':',2)::integer;
  t:=split_part(h->>'to',':',1)::integer*60+split_part(h->>'to',':',2)::integer;
  if (day_id=d and ((f<t and m>=f and m<t) or (f>t and m>=f))) or (day_id=(d+6)%7 and f>t and m<t) then return true; end if;
 end loop;
 return false;
end $$;
do $$ declare def text; a integer; b integer; begin
 def:=pg_get_functiondef('public.create_order_v2(uuid,text,text,text,text,text,text,jsonb,text,text)'::regprocedure);
 a:=position('  if jsonb_array_length(coalesce(v_store.working_hours' in def);
 b:=position('  if p_order_type not in' in def);
 if a=0 or b<=a then raise exception 'Unexpected order hours definition'; end if;
 execute left(def,a-1)||'  if not public.hours_open(v_store.working_hours,v_store.timezone) then raise exception ''المطعم مغلق حاليًا''; end if;'||chr(10)||substring(def from b);
end $$;
create trigger offers_product_scope before insert or update on public.offers for each row execute function public.offer_product_scope();
create trigger banners_product_scope before insert or update on public.banners for each row execute function public.offer_product_scope();
create or replace function public.effective_product_price(p_id uuid) returns numeric language sql stable security definer set search_path=public as $$
 select round(p.price*(100-coalesce((select max(o.discount_percentage) from public.offers o where o.store_id=p.store_id and o.active and (o.product_id is null or o.product_id=p.id)),0))/100,2) from public.products p where p.id=p_id;
$$;
-- Change both order totals and the authoritative item-price validator together.
do $$ declare definition text; target regprocedure; begin
 foreach target in array array['public.create_order_v2(uuid,text,text,text,text,text,text,jsonb,text,text)'::regprocedure,'public.validate_order_item_options()'::regprocedure] loop
  definition:=pg_get_functiondef(target);
  if position('v_product.price' in definition)=0 then raise exception 'Unexpected pricing function'; end if;
  execute replace(definition,'v_product.price','public.effective_product_price(v_product.id)');
 end loop;
end $$;

do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='public.staff_invitations'::regclass and contype='u' and pg_get_constraintdef(oid) like '%organization_id, email, store_id, status%' loop
 execute format('alter table public.staff_invitations drop constraint %I',c.conname);
 end loop;
end $$;
create unique index staff_pending_invitation on public.staff_invitations(organization_id,email,store_id) where status='pending';
create or replace function public.create_staff_invitation(p_store_id uuid,p_email text,p_role text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare org uuid; token text:=encode(gen_random_bytes(32),'hex'); inv uuid;
begin
 select organization_id into org from public.stores where id=p_store_id;
 if org is null or not (public.is_platform_admin() or public.is_org_member(org,array['owner','admin']) or exists(select 1 from public.store_members where store_id=p_store_id and user_id=auth.uid() and role='admin')) then raise exception 'Not authorized'; end if;
 if p_role not in ('admin','manager','cashier','kitchen','accountant') or p_email !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Invalid invitation'; end if;
 insert into public.staff_invitations(organization_id,store_id,email,role,token_hash,invited_by)
 values(org,p_store_id,lower(trim(p_email)),p_role,encode(digest(token,'sha256'),'hex'),auth.uid())
 on conflict(organization_id,email,store_id) where status='pending' do update set token_hash=excluded.token_hash,role=excluded.role,expires_at=now()+interval '7 days',invited_by=auth.uid()
 returning id into inv;
 return jsonb_build_object('id',inv,'token',token);
end $$;
create or replace function public.accept_staff_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare inv public.staff_invitations; email text;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select lower(u.email) into email from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null;
 select * into inv from public.staff_invitations where token_hash=encode(digest(p_token,'sha256'),'hex') and status='pending' and expires_at>now() for update;
 if not found or email is distinct from lower(inv.email) then raise exception 'Invitation unavailable or email does not match'; end if;
 insert into public.store_members(store_id,user_id,role) values(inv.store_id,auth.uid(),inv.role) on conflict(store_id,user_id) do update set role=excluded.role;
 update public.staff_invitations set status='accepted',token_hash=null where id=inv.id;
 return jsonb_build_object('role',inv.role,'slug',(select slug from public.stores where id=inv.store_id));
end $$;
revoke all on function public.create_staff_invitation(uuid,text,text),public.accept_staff_invitation(text) from public,anon;
grant execute on function public.create_staff_invitation(uuid,text,text),public.accept_staff_invitation(text) to authenticated;

create or replace function public.store_has_feature(p_store uuid,p_feature text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.stores s join public.subscriptions sub on sub.organization_id=s.organization_id join public.plans p on p.id=sub.plan_id where s.id=p_store and sub.status in ('active','trial') and p.features ? p_feature);
$$;
-- Restrictive write policies are ANDed with existing staff authorization policies.
do $$ declare entry text[]; operation text; begin
 foreach entry slice 1 in array array[['offers','coupons'],['banners','coupons'],['campaigns','advanced_reports'],['inventory_items','integrations'],['preparation_stations','integrations'],['capacity_slots','integrations'],['limited_offers','integrations']] loop
 foreach operation in array array['insert','update','delete'] loop
  execute format('create policy %I on public.%I as restrictive for %s to authenticated %s %s',
    'plan_'||operation,entry[1],operation,
    case when operation<>'insert' then format('using (public.is_platform_admin() or public.store_has_feature(store_id,%L))',entry[2]) else '' end,
    case when operation<>'delete' then format('with check (public.is_platform_admin() or public.store_has_feature(store_id,%L))',entry[2]) else '' end);
 end loop; end loop;
end $$;
