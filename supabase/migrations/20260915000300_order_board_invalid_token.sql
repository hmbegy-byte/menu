create or replace function public.order_board_snapshot(p_access_token uuid)
returns table(order_number bigint,status text,updated_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if not exists (
    select 1
    from public.order_display_boards
    where access_token=p_access_token and is_active
  ) then
    raise exception 'رابط الشاشة غير صالح أو متوقف';
  end if;

  return query
  select o.order_number,o.status,coalesce(o.ready_at,o.accepted_at,o.created_at)
  from public.order_display_boards b
  join public.orders o on o.store_id=b.store_id
  where b.access_token=p_access_token
    and b.is_active
    and o.status in ('preparing','ready')
    and o.created_at > now()-interval '1 day'
  order by case o.status when 'ready' then 0 else 1 end,o.created_at;
end $$;

revoke all on function public.order_board_snapshot(uuid) from public;
grant execute on function public.order_board_snapshot(uuid) to anon,authenticated;
