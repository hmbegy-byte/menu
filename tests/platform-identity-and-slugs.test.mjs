import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/20260929000300_platform_identity_and_store_aliases.sql",
    import.meta.url,
  ),
  "utf8",
);

test("platform identity is owner-only, publicly projected and audited", () => {
  assert.match(migration, /save_platform_brand/);
  assert.match(migration, /if not public\.is_platform_admin\(\)/);
  assert.match(migration, /public_brand\(p_store_slug/);
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /grant execute on function public\.public_brand\(text\) to anon/);
});

test("slug changes are atomic, retain aliases and reject cross-tenant reuse", () => {
  assert.match(
    migration,
    /select slug,organization_id into old_slug,org from public\.stores where id=p_store for update/,
  );
  assert.match(migration, /insert into public\.store_slug_aliases\(slug,store_id,replaced_by\)/);
  assert.match(
    migration,
    /exists\(select 1 from public\.store_slug_aliases where slug=normalized and store_id<>p_store\)/,
  );
  assert.match(migration, /normalized = any\(array\[/);
  assert.match(migration, /'change_slug'/);
});

test("old URLs redirect internally and staff login uses stable account identity", () => {
  const redirect = readFileSync(
    new URL("../src/components/StoreSlugRedirect.tsx", import.meta.url),
    "utf8",
  );
  const access = readFileSync(new URL("../src/lib/access.ts", import.meta.url), "utf8");
  assert.match(redirect, /window\.location\.replace/);
  assert.match(redirect, /window\.location\.search/);
  assert.match(redirect, /window\.location\.hash/);
  assert.match(access, /resolve_staff_login/);
  assert.match(migration, /join auth\.users u on u\.id=a\.user_id/);
});

test("platform and store metadata are resolved before render", () => {
  const root = readFileSync(new URL("../src/routes/__root.tsx", import.meta.url), "utf8");
  const menu = readFileSync(new URL("../src/routes/s.$store_slug.tsx", import.meta.url), "utf8");
  const manifest = readFileSync(new URL("../src/routes/api.manifest.ts", import.meta.url), "utf8");
  assert.match(root, /loader: \(\) => readPublicBrand\(\)/);
  assert.match(menu, /loader: \(\{ params \}\) => readPublicBrand\(params\.store_slug\)/);
  assert.match(manifest, /"Cache-Control": "no-store"/);
  const brand = readFileSync(new URL("../src/lib/platformBrand.ts", import.meta.url), "utf8");
  assert.match(brand, /value !== null && value !== undefined && value !== ""/);
});
