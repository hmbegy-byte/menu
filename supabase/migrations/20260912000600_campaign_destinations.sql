alter table public.campaigns add column destination_product_id uuid references public.products(id) on delete set null;
create or replace function public.validate_campaign_destination() returns trigger
language plpgsql set search_path=public,pg_temp as $$ begin
 if new.destination_product_id is not null and not exists(select 1 from public.products where id=new.destination_product_id and store_id=new.store_id) then raise exception 'Campaign product belongs to another restaurant'; end if;
 return new;
end $$;
create trigger campaign_destination_scope before insert or update on public.campaigns for each row execute function public.validate_campaign_destination();
