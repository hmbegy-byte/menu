-- Migration for Loyalty System and Brand Assets (Flavor Flow)

-- 1. Brand Assets Table
create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  is_platform_default boolean not null default false,
  brand_name text,
  logo_url text,
  favicon_url text,
  cover_url text,
  theme_color text,
  meta_title text,
  meta_description text,
  og_image_url text,
  pwa_short_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_assets_target_check check (
    (is_platform_default = true and organization_id is null and store_id is null) or
    (is_platform_default = false and (organization_id is not null or store_id is not null))
  )
);

create unique index if not exists brand_assets_platform_idx on public.brand_assets(is_platform_default) where is_platform_default = true;
create unique index if not exists brand_assets_org_idx on public.brand_assets(organization_id) where store_id is null and organization_id is not null;
create unique index if not exists brand_assets_store_idx on public.brand_assets(store_id) where store_id is not null;

-- 2. Loyalty Programs
create table if not exists public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_active boolean not null default false,
  program_type text not null default 'points' check (program_type in ('points', 'stamps', 'hybrid')),
  wallet_settings jsonb not null default '{"apple_enabled":false,"samsung_enabled":false}'::jsonb,
  points_name text not null default 'نقاط',
  stamps_name text not null default 'أختام',
  min_order_amount numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id)
);

-- 3. Loyalty Customers
create table if not exists public.loyalty_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  phone text not null,
  name text,
  membership_number text not null default upper(substr(md5(random()::text), 1, 8)),
  points_balance integer not null default 0 check (points_balance >= 0),
  stamps_balance integer not null default 0 check (stamps_balance >= 0),
  qr_token text not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, phone),
  unique(organization_id, auth_user_id),
  unique(qr_token)
);

-- 4. Loyalty Earning Rules
create table if not exists public.loyalty_earning_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_active boolean not null default true,
  rule_type text not null check (rule_type in ('points_per_currency', 'fixed_per_order', 'fixed_over_amount', 'multiplier_for_items', 'stamps_for_items', 'first_order', 'happy_hour')),
  reward_value numeric(12,2) not null check (reward_value > 0),
  currency_type text not null default 'points' check (currency_type in ('points', 'stamps')),
  min_amount numeric(12,2) default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  max_per_day integer,
  conditions jsonb not null default '{}'::jsonb,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Loyalty Rewards
create table if not exists public.loyalty_rewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  is_active boolean not null default true,
  reward_type text not null check (reward_type in ('fixed_discount', 'percent_discount', 'free_item', 'free_addon', 'free_delivery', 'bogo', 'stamps_completion')),
  reward_value numeric(12,2) not null check (reward_value > 0),
  points_cost integer default 0,
  stamps_cost integer default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  conditions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_check check (points_cost > 0 or stamps_cost > 0)
);

-- 6. Loyalty Transactions
create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  customer_id uuid not null references public.loyalty_customers(id) on delete cascade,
  amount integer not null,
  currency_type text not null check (currency_type in ('points', 'stamps')),
  transaction_type text not null check (transaction_type in ('earn', 'redeem', 'reverse', 'manual_adjust')),
  order_id uuid references public.orders(id) on delete set null,
  staff_id uuid references auth.users(id) on delete set null,
  reason text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  unique(idempotency_key)
);

-- 7. Loyalty Redemptions
create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  customer_id uuid not null references public.loyalty_customers(id) on delete cascade,
  reward_id uuid not null references public.loyalty_rewards(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'applied' check (status in ('applied', 'reversed')),
  created_at timestamptz not null default now()
);

-- 8. Wallet Pass Registrations
create table if not exists public.wallet_pass_registrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.loyalty_customers(id) on delete cascade,
  pass_type text not null check (pass_type in ('apple', 'samsung')),
  device_library_identifier text not null,
  pass_type_identifier text not null,
  push_token text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(device_library_identifier, pass_type_identifier, pass_type)
);

-- Row Level Security (RLS)

alter table public.brand_assets enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_customers enable row level security;
alter table public.loyalty_earning_rules enable row level security;
alter table public.loyalty_rewards enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.loyalty_redemptions enable row level security;
alter table public.wallet_pass_registrations enable row level security;

-- Policies for Brand Assets
create policy "public reads brand_assets" on public.brand_assets for select using (true);
create policy "platform admins manage platform brand" on public.brand_assets for all using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "owners manage org brand" on public.brand_assets for all using (public.is_org_member(organization_id, array['owner', 'admin']) or public.is_platform_admin()) with check (public.is_org_member(organization_id, array['owner', 'admin']) or public.is_platform_admin());

-- Policies for Loyalty Programs
create policy "public reads loyalty programs" on public.loyalty_programs for select using (is_active or public.is_org_member(organization_id));
create policy "owners manage loyalty programs" on public.loyalty_programs for all using (public.is_org_member(organization_id, array['owner', 'admin', 'manager']) or public.is_platform_admin()) with check (public.is_org_member(organization_id, array['owner', 'admin', 'manager']) or public.is_platform_admin());

-- Policies for Loyalty Customers
create policy "members read loyalty customers" on public.loyalty_customers for select using (auth_user_id = auth.uid() or public.is_org_member(organization_id));
create policy "members manage loyalty customers" on public.loyalty_customers for all using (public.is_org_member(organization_id, array['owner', 'admin', 'manager']) or exists (select 1 from public.store_members sm join public.stores s on s.id=sm.store_id where s.organization_id=loyalty_customers.organization_id and sm.user_id=auth.uid() and sm.role in ('admin','manager','cashier'))) with check (public.is_org_member(organization_id, array['owner', 'admin', 'manager']) or exists (select 1 from public.store_members sm join public.stores s on s.id=sm.store_id where s.organization_id=loyalty_customers.organization_id and sm.user_id=auth.uid() and sm.role in ('admin','manager','cashier')));

-- Policies for Rules and Rewards
create policy "public reads active earning rules" on public.loyalty_earning_rules for select using (is_active or public.is_org_member(organization_id));
create policy "owners manage earning rules" on public.loyalty_earning_rules for all using (public.is_org_member(organization_id, array['owner', 'admin', 'manager'])) with check (public.is_org_member(organization_id, array['owner', 'admin', 'manager']));

create policy "public reads active rewards" on public.loyalty_rewards for select using (is_active or public.is_org_member(organization_id));
create policy "owners manage rewards" on public.loyalty_rewards for all using (public.is_org_member(organization_id, array['owner', 'admin', 'manager'])) with check (public.is_org_member(organization_id, array['owner', 'admin', 'manager']));

-- Policies for Transactions and Redemptions
create policy "members read transactions" on public.loyalty_transactions for select using (public.is_org_member(organization_id) or exists (select 1 from public.loyalty_customers c where c.id=customer_id and c.auth_user_id=auth.uid()));

create policy "members read redemptions" on public.loyalty_redemptions for select using (public.is_org_member(organization_id));
create policy "members manage redemptions" on public.loyalty_redemptions for all using (public.is_org_member(organization_id, array['owner', 'admin', 'manager', 'cashier'])) with check (public.is_org_member(organization_id, array['owner', 'admin', 'manager', 'cashier']));

-- Database Triggers for Balances

create or replace function public.update_loyalty_balance()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op = 'INSERT' then
    if new.currency_type = 'points' then
      update public.loyalty_customers set points_balance = points_balance + new.amount where id = new.customer_id;
    elsif new.currency_type = 'stamps' then
      update public.loyalty_customers set stamps_balance = stamps_balance + new.amount where id = new.customer_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists loyalty_transaction_balance_update on public.loyalty_transactions;
create trigger loyalty_transaction_balance_update after insert on public.loyalty_transactions
for each row execute function public.update_loyalty_balance();

create or replace function public.adjust_loyalty_balance(
  p_store_id uuid, p_customer_id uuid, p_amount integer,
  p_currency_type text, p_reason text
) returns table(points_balance integer, stamps_balance integer)
language plpgsql security definer set search_path=public as $$
declare
  v_org_id uuid;
  v_points integer;
  v_stamps integer;
begin
  if p_amount = 0 or p_currency_type not in ('points','stamps') or nullif(trim(p_reason),'') is null then
    raise exception 'Invalid loyalty adjustment';
  end if;
  select organization_id into v_org_id from public.stores where id=p_store_id;
  if v_org_id is null or not (
    public.is_platform_admin() or public.is_org_member(v_org_id, array['owner','admin','manager']) or
    exists(select 1 from public.store_members where store_id=p_store_id and user_id=auth.uid() and role in ('admin','manager','cashier'))
  ) then raise exception 'Not authorized'; end if;
  select c.points_balance,c.stamps_balance into v_points,v_stamps
  from public.loyalty_customers c where c.id=p_customer_id and c.organization_id=v_org_id for update;
  if not found then raise exception 'Customer not found'; end if;
  if (p_currency_type='points' and v_points+p_amount<0) or (p_currency_type='stamps' and v_stamps+p_amount<0) then
    raise exception 'Insufficient balance';
  end if;
  insert into public.loyalty_transactions(organization_id,store_id,customer_id,amount,currency_type,transaction_type,staff_id,reason)
  values(v_org_id,p_store_id,p_customer_id,p_amount,p_currency_type,'manual_adjust',auth.uid(),trim(p_reason));
  return query select c.points_balance,c.stamps_balance from public.loyalty_customers c where c.id=p_customer_id;
end $$;
grant execute on function public.adjust_loyalty_balance(uuid,uuid,integer,text,text) to authenticated;

-- Function to Auto-process points for completed orders

create or replace function public.process_order_loyalty()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_org_id uuid;
  v_customer_id uuid;
  v_program public.loyalty_programs;
  v_rule public.loyalty_earning_rules;
  v_points_to_add integer := 0;
  v_idempotency text;
begin
  -- Only process on status change to completed or cancelled
  if old.status = new.status then return new; end if;

  select organization_id into v_org_id from public.stores where id = new.store_id;
  
  -- Get program
  select * into v_program from public.loyalty_programs where organization_id = v_org_id and is_active = true;
  if not found then return new; end if;

  -- Create or get customer by phone
  insert into public.loyalty_customers (organization_id, phone, name)
  values (v_org_id, regexp_replace(new.customer_phone,'\s','','g'), new.customer_name)
  on conflict (organization_id, phone) do update set name = coalesce(public.loyalty_customers.name, excluded.name)
  returning id into v_customer_id;

  if new.status = 'completed' then
    v_idempotency := 'earn_' || new.id::text;
    
    -- Basic rule processing (points_per_currency)
    select * into v_rule from public.loyalty_earning_rules 
    where organization_id = v_org_id and is_active = true and rule_type = 'points_per_currency' 
    order by priority desc limit 1;

    if found and new.total_amount >= v_program.min_order_amount then
      v_points_to_add := floor(new.total_amount * v_rule.reward_value);
      
      if v_points_to_add > 0 then
        insert into public.loyalty_transactions(organization_id, store_id, customer_id, amount, currency_type, transaction_type, order_id, idempotency_key)
        values (v_org_id, new.store_id, v_customer_id, v_points_to_add, 'points', 'earn', new.id, v_idempotency)
        on conflict (idempotency_key) do nothing;
      end if;
    end if;

  elsif new.status = 'cancelled' then
    -- Reverse points if cancelled
    v_idempotency := 'reverse_' || new.id::text;
    
    -- Find how many points were added for this order
    select sum(amount) into v_points_to_add from public.loyalty_transactions 
    where order_id = new.id and transaction_type = 'earn' and currency_type = 'points';
    
    if coalesce(v_points_to_add, 0) > 0 then
      insert into public.loyalty_transactions(organization_id, store_id, customer_id, amount, currency_type, transaction_type, order_id, reason, idempotency_key)
      values (v_org_id, new.store_id, v_customer_id, -v_points_to_add, 'points', 'reverse', new.id, 'Order Cancelled', v_idempotency)
      on conflict (idempotency_key) do nothing;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists process_order_loyalty_trigger on public.orders;
create trigger process_order_loyalty_trigger after update on public.orders
for each row execute function public.process_order_loyalty();

-- Add storage bucket for brand assets
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('brand-assets','brand-assets',true,2097152,array['image/jpeg','image/png','image/webp','image/svg+xml','image/x-icon'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "public reads brand assets" on storage.objects for select using (bucket_id='brand-assets');
create policy "admins upload brand assets" on storage.objects for insert to authenticated
  with check (bucket_id='brand-assets' and exists(select 1 from public.store_members sm where sm.user_id=auth.uid() and sm.store_id::text=(storage.foldername(name))[1] and sm.role in ('admin','manager')));
create policy "admins update brand assets" on storage.objects for update to authenticated
  using (bucket_id='brand-assets' and exists(select 1 from public.store_members sm where sm.user_id=auth.uid() and sm.store_id::text=(storage.foldername(name))[1] and sm.role in ('admin','manager')));
create policy "admins delete brand assets" on storage.objects for delete to authenticated
  using (bucket_id='brand-assets' and exists(select 1 from public.store_members sm where sm.user_id=auth.uid() and sm.store_id::text=(storage.foldername(name))[1] and sm.role in ('admin','manager')));
