create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), reference bigint generated always as identity unique,
 store_id uuid not null references public.stores(id), requester_id uuid not null references auth.users(id),
 subject text not null check(length(subject) between 5 and 150),
 details text not null check(length(details) between 10 and 4000),
 status text not null default 'open' check(status in ('open','in_progress','resolved')),
 created_at timestamptz not null default now(), resolved_at timestamptz
);
alter table public.support_tickets enable row level security;
create policy "support reads" on public.support_tickets for select to authenticated using(public.is_platform_admin() or public.is_store_member(store_id,array['admin','manager']));
create policy "support creates" on public.support_tickets for insert to authenticated with check(requester_id=auth.uid() and status='open' and resolved_at is null and public.is_store_member(store_id,array['admin','manager']));
create policy "platform resolves support" on public.support_tickets for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
revoke all on public.support_tickets from anon,authenticated;
grant select on public.support_tickets to authenticated;
grant insert(id,store_id,requester_id,subject,details) on public.support_tickets to authenticated;
grant update(status,resolved_at) on public.support_tickets to authenticated;
grant usage on sequence public.support_tickets_reference_seq to authenticated;
