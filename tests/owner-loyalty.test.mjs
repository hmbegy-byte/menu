import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20260912000100_owner_loyalty_controls.sql',import.meta.url),'utf8');
test('staff manual adjustments default off and are checked server-side',()=>{
 assert.ok(sql.includes('allow_staff_adjustments boolean not null default false'));
 assert.ok(sql.includes('Manual adjustments disabled by owner'));
});
test('reward redemption is tenant-scoped, locked and idempotent',()=>{
 assert.ok(sql.includes('pg_advisory_xact_lock'));
 assert.ok(sql.includes('where id=p_customer_id and organization_id=org for update'));
 assert.ok(sql.includes('Insufficient balance'));
 assert.ok(sql.includes('request_key uuid unique'));
 assert.ok(sql.includes('reward_snapshot'));
});
test('earning requires unique enrolled phone and ignores unsupported rule types',()=>{
 assert.ok(sql.includes("if not found or new.total_amount<program.min_order_amount"));
 assert.ok(sql.includes("else continue; end if"));
 assert.ok(sql.includes('on conflict(idempotency_key) do nothing'));
 assert.ok(!sql.includes('insert into public.loyalty_customers'));
});
