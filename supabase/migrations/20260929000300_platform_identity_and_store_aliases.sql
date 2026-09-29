-- Central platform identity and safe, repeatable restaurant slug changes.
-- Additive migration: no existing identity, restaurant or customer data is deleted.

alter table public.brand_assets add column if not exists legal_name text;
alter table public.brand_assets add column if not exists support_email text;
alter table public.brand_assets add column if not exists support_phone text;
revoke select on public.brand_assets from anon;
grant select on public.brand_assets to authenticated, service_role;
drop policy if exists "public reads brand_assets" on public.brand_assets;
drop policy if exists "authorized reads brand_assets" on public.brand_assets;
create policy "authorized reads brand_assets" on public.brand_assets for select to authenticated
using (
  public.is_platform_admin()
  or (organization_id is not null and public.is_org_member(organization_id))
  or (store_id is not null and public.is_store_member(store_id))
);

create table if not exists public.store_slug_aliases (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  store_id uuid not null references public.stores(id) on delete cascade,
  replaced_at timestamptz not null default now(),
  replaced_by uuid references auth.users(id) on delete set null
);
create index if not exists store_slug_aliases_store_idx
  on public.store_slug_aliases(store_id, replaced_at desc);
alter table public.store_slug_aliases enable row level security;
drop policy if exists "public resolves store aliases" on public.store_slug_aliases;
revoke all on public.store_slug_aliases from anon, authenticated;
grant select,insert,update,delete on public.store_slug_aliases to service_role;

create or replace function public.public_brand(p_store_slug text default null)
returns table(
  brand_name text, logo_url text, favicon_url text, cover_url text,
  theme_color text, meta_title text, meta_description text,
  og_image_url text, pwa_short_name text, support_email text, support_phone text
)
language sql stable security definer set search_path=public as $$
  with target_store as (
    select s.*
    from public.stores s
    where s.slug=lower(trim(p_store_slug))
       or s.id=(select a.store_id from public.store_slug_aliases a where a.slug=lower(trim(p_store_slug)))
    limit 1
  )
  select b.brand_name,b.logo_url,b.favicon_url,b.cover_url,b.theme_color,
         b.meta_title,b.meta_description,b.og_image_url,b.pwa_short_name,b.support_email,b.support_phone
  from public.brand_assets b where (p_store_slug is null or trim(p_store_slug)='') and b.is_platform_default
  union all
  select coalesce(b.brand_name,s.name),coalesce(b.logo_url,s.logo_url),b.favicon_url,
         coalesce(b.cover_url,s.cover_url),coalesce(b.theme_color,s.appearance->>'primaryColor'),
         coalesce(b.meta_title,s.name),coalesce(b.meta_description,s.bio),
         coalesce(b.og_image_url,s.cover_url),coalesce(b.pwa_short_name,s.name),
         coalesce(b.support_email,s.white_label->>'supportEmail'),
         coalesce(b.support_phone,s.white_label->>'supportPhone')
  from target_store s left join public.brand_assets b on b.store_id=s.id
  where p_store_slug is not null and trim(p_store_slug)<>''
  limit 1
$$;
revoke all on function public.public_brand(text) from public;
grant execute on function public.public_brand(text) to anon, authenticated, service_role;

create or replace function public.save_platform_brand(p_brand jsonb)
returns public.brand_assets
language plpgsql security definer set search_path=public as $$
declare saved public.brand_assets;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if nullif(trim(p_brand->>'brand_name'),'') is null then raise exception 'Brand name is required'; end if;
  if p_brand ? 'support_email' and coalesce(p_brand->>'support_email','') <> ''
     and p_brand->>'support_email' !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Invalid support email';
  end if;
  if exists (
    select 1 from jsonb_each_text(p_brand) f
    where f.key in ('logo_url','favicon_url','og_image_url')
      and f.value<>'' and f.value !~ '^https://'
  ) then raise exception 'Brand asset URLs must use HTTPS'; end if;
  insert into public.brand_assets(
    is_platform_default,brand_name,legal_name,logo_url,favicon_url,theme_color,
    meta_title,meta_description,og_image_url,pwa_short_name,support_email,support_phone,updated_at
  ) values (
    true,trim(p_brand->>'brand_name'),nullif(trim(p_brand->>'legal_name'),''),
    nullif(trim(p_brand->>'logo_url'),''),nullif(trim(p_brand->>'favicon_url'),''),
    nullif(trim(p_brand->>'theme_color'),''),nullif(trim(p_brand->>'meta_title'),''),
    nullif(trim(p_brand->>'meta_description'),''),nullif(trim(p_brand->>'og_image_url'),''),
    nullif(trim(p_brand->>'pwa_short_name'),''),nullif(trim(p_brand->>'support_email'),''),
    nullif(trim(p_brand->>'support_phone'),''),now()
  )
  on conflict (is_platform_default) where is_platform_default=true do update set
    brand_name=excluded.brand_name,legal_name=excluded.legal_name,logo_url=excluded.logo_url,
    favicon_url=excluded.favicon_url,theme_color=excluded.theme_color,
    meta_title=excluded.meta_title,meta_description=excluded.meta_description,
    og_image_url=excluded.og_image_url,pwa_short_name=excluded.pwa_short_name,
    support_email=excluded.support_email,support_phone=excluded.support_phone,updated_at=now()
  returning * into saved;
  return saved;
end $$;
revoke all on function public.save_platform_brand(jsonb) from public;
grant execute on function public.save_platform_brand(jsonb) to authenticated, service_role;

create or replace function public.resolve_store_slug(p_slug text)
returns table(store_id uuid,current_slug text,is_alias boolean)
language sql stable security definer set search_path=public as $$
  select s.id,s.slug,false from public.stores s where s.slug=lower(trim(p_slug))
  union all
  select s.id,s.slug,true from public.store_slug_aliases a
    join public.stores s on s.id=a.store_id
    where a.slug=lower(trim(p_slug))
  limit 1
$$;
revoke all on function public.resolve_store_slug(text) from public;
grant execute on function public.resolve_store_slug(text) to anon, authenticated, service_role;

create or replace function public.resolve_staff_login(p_slug text,p_username text)
returns text language sql stable security definer set search_path=public,auth as $$
  select u.email
  from public.staff_accounts a
  join auth.users u on u.id=a.user_id
  join public.stores s on s.id=a.store_id
  where a.username=lower(trim(p_username)) and not a.disabled
    and (s.slug=lower(trim(p_slug)) or exists(
      select 1 from public.store_slug_aliases x
      where x.store_id=s.id and x.slug=lower(trim(p_slug))
    ))
  limit 1
$$;
revoke all on function public.resolve_staff_login(text,text) from public;
grant execute on function public.resolve_staff_login(text,text) to anon, authenticated, service_role;

create or replace function public.change_store_slug(p_store uuid,p_new_slug text)
returns text language plpgsql security definer set search_path=public as $$
declare old_slug text; normalized text:=lower(trim(p_new_slug)); org uuid;
begin
  if not public.is_platform_admin() then raise exception 'Not authorized'; end if;
  if normalized !~ '^[a-z0-9][a-z0-9-]{2,62}$' then raise exception 'Invalid slug'; end if;
  if normalized = any(array['admin','api','platform','kitchen','s','track','legal','auth','www']) then
    raise exception 'Reserved slug';
  end if;
  select slug,organization_id into old_slug,org from public.stores where id=p_store for update;
  if not found then raise exception 'Store not found'; end if;
  if normalized=old_slug then return old_slug; end if;
  if exists(select 1 from public.stores where slug=normalized and id<>p_store)
     or exists(select 1 from public.store_slug_aliases where slug=normalized and store_id<>p_store) then
    raise exception 'Slug unavailable';
  end if;
  -- A previous alias of this same restaurant can safely become current again.
  delete from public.store_slug_aliases where slug=normalized and store_id=p_store;
  insert into public.store_slug_aliases(slug,store_id,replaced_by)
    values(old_slug,p_store,auth.uid()) on conflict (slug) do nothing;
  update public.stores set slug=normalized where id=p_store;
  insert into public.audit_logs(organization_id,store_id,actor_id,action,entity_type,entity_id,changes)
  values(org,p_store,auth.uid(),'change_slug','store',p_store::text,
    jsonb_build_object('old_slug',old_slug,'new_slug',normalized));
  return normalized;
end $$;
revoke all on function public.change_store_slug(uuid,text) from public;
grant execute on function public.change_store_slug(uuid,text) to authenticated, service_role;

create or replace function public.audit_brand_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_logs(organization_id,store_id,actor_id,action,entity_type,entity_id,changes)
  values(coalesce(new.organization_id,old.organization_id),coalesce(new.store_id,old.store_id),auth.uid(),
    lower(tg_op),'brand_assets',coalesce(new.id,old.id)::text,
    jsonb_build_object('before',case when tg_op='INSERT' then null else to_jsonb(old) end,
                       'after',case when tg_op='DELETE' then null else to_jsonb(new) end));
  return coalesce(new,old);
end $$;
drop trigger if exists audit_brand_assets_change on public.brand_assets;
create trigger audit_brand_assets_change after insert or update or delete on public.brand_assets
for each row execute function public.audit_brand_change();

-- Prevent a newly created store from taking a historical alias owned by any store.
create or replace function public.prevent_store_slug_alias_collision()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from public.store_slug_aliases a where a.slug=new.slug and a.store_id<>new.id) then
    raise exception 'Slug unavailable';
  end if;
  return new;
end $$;
drop trigger if exists prevent_store_slug_alias_collision on public.stores;
create trigger prevent_store_slug_alias_collision before insert or update of slug on public.stores
for each row execute function public.prevent_store_slug_alias_collision();
