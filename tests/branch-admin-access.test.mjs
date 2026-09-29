import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("organization owners can administer newly-created branches", () => {
  const sql = read("supabase/migrations/20260929000200_organization_branch_admin_access.sql");
  assert.match(sql, /join public\.organization_members/);
  assert.match(sql, /om\.role in \('owner','admin'\)/);
  assert.match(sql, /'admin'=any\(allowed_roles\)/);
  assert.doesNotMatch(sql, /om\.role in \('owner','admin'\).*'kitchen'=any/s);
});

test("branch manager exposes scoped admin, menu and kitchen destinations", () => {
  const component = read("src/pages/admin/BranchManager.tsx");
  assert.match(component, /to="\/admin\/\$store_slug"/);
  assert.match(component, /إدارة الفرع/);
  assert.match(component, /`\/kitchen\/\$\{branch\.slug\}`/);
  assert.match(component, /unlockAdmin\(branch\.slug\)/);
});
