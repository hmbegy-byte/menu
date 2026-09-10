create table public.staff_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id),
  username text not null check (username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  role text not null check (role in ('admin','kitchen')),
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(store_id, username)
);
alter table public.staff_accounts enable row level security;
create policy "platform reads staff accounts" on public.staff_accounts
  for select to authenticated using (public.is_platform_admin());
-- Writes are restricted to the platform-authorized server function.
revoke all on public.staff_accounts from anon, authenticated;
grant select on public.staff_accounts to authenticated;
