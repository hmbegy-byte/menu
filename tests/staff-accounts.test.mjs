import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('staff administration authenticates platform owner before creating users', () => {
  const code = read('supabase/functions/manage-staff/index.ts');
  assert.ok(code.indexOf('admin.auth.getUser(token)') < code.indexOf('admin.auth.admin.createUser'));
  assert.ok(code.indexOf('if (!owner)') < code.indexOf('admin.auth.admin.createUser'));
  assert.ok(code.includes(".eq('store_id', store.id)"));
  assert.ok(code.includes("admin.from('store_members').delete()"));
  assert.ok(!read('src/components/PlatformStaffAccounts.tsx').includes('SERVICE_ROLE'));
});
test('kitchen uses independent credentials and is outside the admin idle lock', () => {
  assert.ok(read('src/lib/supabase.ts').includes('flavor-flow-kitchen-auth'));
  assert.ok(read('src/hooks/useKitchenData.ts').includes('kitchenSupabase as supabase'));
  assert.ok(read('src/pages/Kitchen.tsx').includes('signOutStore(true)'));
  assert.ok(!read('src/pages/Kitchen.tsx').includes('lockAdmin'));
  assert.ok(read('src/pages/Admin.tsx').includes('15 * 60 * 1000'));
  for (const path of ['src/pages/AdminGate.tsx','src/pages/KitchenGate.tsx']) {
    assert.ok(!read(path).includes('StaffGoogleAccess'));
    assert.ok(read(path).includes('autoComplete="username"'));
  }
});
