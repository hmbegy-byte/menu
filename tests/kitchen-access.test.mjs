import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/20260910000200_kitchen_access_check.sql', import.meta.url), 'utf8');
const hook = readFileSync(new URL('../src/hooks/useKitchenData.ts', import.meta.url), 'utf8');

test('kitchen entitlement RPC verifies caller and store before subscription lookup', () => {
  assert.match(sql, /auth\.uid\(\) is null/);
  assert.match(sql, /store_id = p_store_id and user_id = auth\.uid\(\)/);
  assert.match(sql, /role in \('admin', 'kitchen'\)/);
  assert.ok(sql.indexOf("return 'ACCESS_DENIED'") < sql.indexOf('select sub.status'));
  assert.match(sql, /revoke all .* from public, anon/);
  assert.match(sql, /returns text/);
});

test('kitchen distinguishes missing, inactive and excluded subscription without billing reads', () => {
  for (const code of ['SUBSCRIPTION_MISSING', 'SUBSCRIPTION_INACTIVE', 'KITCHEN_NOT_INCLUDED']) {
    assert.ok(sql.includes(code));
    assert.ok(hook.includes(code));
  }
  assert.match(sql, /v_status not in \('active', 'trial'\)/);
  assert.match(sql, /v_features @> '\["kitchen"\]'/);
  assert.ok(!hook.includes('.from("subscriptions")'));
  assert.ok(hook.includes('access !== "ALLOWED"'));
});
