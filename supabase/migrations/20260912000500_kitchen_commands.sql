create table public.kitchen_commands (
 id uuid primary key, store_id uuid not null references public.stores(id),
 user_id uuid not null references auth.users(id), order_id uuid not null references public.orders(id),
 expected_status text not null, target_status text not null,
 created_at timestamptz not null default now()
);
alter table public.kitchen_commands enable row level security;
revoke all on public.kitchen_commands from anon,authenticated;
create or replace function public.kitchen_set_status(p_store uuid,p_order uuid,p_expected text,p_target text,p_command uuid)
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare o public.orders; c public.kitchen_commands;
begin
 if auth.uid() is null or not exists(select 1 from public.store_members where store_id=p_store and user_id=auth.uid() and role in ('admin','kitchen')) then raise exception 'Not authorized'; end if;
 if p_command is null or p_expected is null or p_target is null then raise exception 'Command and states required'; end if;
 perform pg_advisory_xact_lock(hashtext(p_command::text));
 select * into c from public.kitchen_commands where id=p_command;
 if found then
   if c.store_id<>p_store or c.order_id<>p_order or c.user_id<>auth.uid() or c.target_status<>p_target or c.expected_status<>p_expected then raise exception 'Command conflict'; end if;
   return 'APPLIED';
 end if;
 select * into o from public.orders where id=p_order and store_id=p_store for update;
 if not found then raise exception 'Order unavailable'; end if;
 if o.status<>p_expected then return 'STALE'; end if;
 if not ((p_expected='pending' and p_target in ('preparing','cancelled')) or (p_expected='preparing' and p_target in ('ready','cancelled')) or (p_expected='ready' and p_target in ('completed','cancelled'))) then raise exception 'Invalid transition'; end if;
 update public.orders set status=p_target,
 accepted_at=case when p_target='preparing' then now() else accepted_at end,
 ready_at=case when p_target='ready' then now() else ready_at end,
 completed_at=case when p_target='completed' then now() else completed_at end
 where id=p_order;
 insert into public.kitchen_commands(id,store_id,user_id,order_id,expected_status,target_status) values(p_command,p_store,auth.uid(),p_order,p_expected,p_target);
 return 'APPLIED';
end $$;
revoke all on function public.kitchen_set_status(uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.kitchen_set_status(uuid,uuid,text,text,uuid) to authenticated;
