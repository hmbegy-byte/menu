import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("staff administration authenticates platform owner before creating users", () => {
  const code = read("supabase/functions/manage-staff/index.ts");
  assert.ok(
    code.indexOf("admin.auth.getUser(token)") < code.indexOf("admin.auth.admin.createUser"),
  );
  assert.ok(code.indexOf("if (!owner)") < code.indexOf("admin.auth.admin.createUser"));
  assert.match(code, /\.eq\(["']store_id["'],\s*store.id\)/);
  assert.match(code, /admin.rpc\(["']revoke_managed_account["']/);
  assert.match(code, /admin.rpc\(["']change_managed_account_role["']/);
  assert.match(
    read("supabase/migrations/20260912000900_owner_setup.sql"),
    /delete from public.store_members where user_id=p_user and store_id=p_store/,
  );
  assert.ok(!read("src/components/PlatformStaffAccounts.tsx").includes("SERVICE_ROLE"));
  assert.ok(read("src/components/PlatformStaffAccounts.tsx").includes('execute("role"'));
  const roleMigration = read("supabase/migrations/20260915000100_staff_role_changes.sql");
  assert.match(roleMigration, /update public\.store_members\s+set role=p_role/);
  assert.match(roleMigration, /delete from public\.organization_members/);
  assert.match(
    roleMigration,
    /revoke all on function public\.change_managed_account_role\(uuid,uuid,text\)\s+from public,anon,authenticated/,
  );
});
test("kitchen uses independent credentials and is outside the admin idle lock", () => {
  assert.ok(read("src/lib/supabase.ts").includes("flavor-flow-kitchen-auth"));
  assert.ok(read("src/hooks/useKitchenData.ts").includes("kitchenSupabase as supabase"));
  assert.ok(read("src/pages/Kitchen.tsx").includes("signOutStore(true)"));
  assert.ok(!read("src/pages/Kitchen.tsx").includes("lockAdmin"));
  assert.ok(read("src/pages/Admin.tsx").includes("15 * 60 * 1000"));
  for (const path of ["src/pages/AdminGate.tsx", "src/pages/KitchenGate.tsx"]) {
    assert.ok(!read(path).includes("StaffGoogleAccess"));
    assert.ok(read(path).includes('autoComplete="username"'));
  }
});
