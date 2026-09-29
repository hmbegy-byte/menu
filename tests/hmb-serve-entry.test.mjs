import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public entry uses HMB Serve defaults without redirecting ordinary visitors", async () => {
  const [entry, brand, landing] = await Promise.all([
    read("src/routes/index.tsx"),
    read("src/lib/platformBrand.ts"),
    read("src/pages/Landing.tsx"),
  ]);
  assert.match(brand, /brand_name: "HMB Serve"/);
  assert.match(entry, /setShowLanding\(true\)/);
  assert.doesNotMatch(entry, /last-store-slug/);
  assert.match(landing, /الطلب لا ينشئ حسابًا أو اشتراكًا تلقائيًا/);
  assert.doesNotMatch(landing, /\["12", "جديد"\]/);
});

test("unified login derives destination from server membership", async () => {
  const access = await read("src/lib/access.ts");
  assert.match(access, /resolve_staff_login/);
  assert.match(access, /resolveCurrentStoreSlug/);
  assert.match(access, /membership\.role === "kitchen"/);
  assert.match(access, /\["admin", "manager"\]\.includes\(membership\.role\)/);
  assert.match(access, /membership\.role === "cashier"/);
});

test("trial intake is private, throttled, idempotent and does not provision accounts", async () => {
  const migration = await read("supabase/migrations/20260929000400_hmb_serve_trial_requests.sql");
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.is_platform_admin\(\)/);
  assert.match(migration, /request_key uuid not null unique/);
  assert.match(migration, /interval '15 minutes'/);
  assert.doesNotMatch(
    migration,
    /auth\.users|create_organization_with_owner|insert into public\.stores/i,
  );
});
