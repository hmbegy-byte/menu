-- Saudi launch profile kept separate from storefront copy and appearance.
alter table public.stores
  add column if not exists legal jsonb not null default '{
    "country":"SA",
    "legalName":"",
    "commercialRegistration":"",
    "vatNumber":"",
    "nationalAddress":"",
    "supportEmail":"",
    "complaintPhone":"",
    "privacyEmail":""
  }'::jsonb;

comment on column public.stores.legal is
  'Merchant disclosures used in Saudi checkout, privacy and consumer support surfaces.';
