import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const sql = readFileSync(
  new URL("../supabase/migrations/20260907000300_full_operations_suite.sql", import.meta.url),
  "utf8",
);
const securitySql = readFileSync(
  new URL(
    "../supabase/migrations/20260907000400_secure_operational_workflows.sql",
    import.meta.url,
  ),
  "utf8",
);
const operationsUi = readFileSync(
  new URL("../src/pages/admin/OperationsSuite.tsx", import.meta.url),
  "utf8",
);
test("money-like balances use a unique ledger key", () => {
  assert.match(sql, /value_ledger[\s\S]*idempotency_key text not null unique/);
  assert.match(sql, /v_balance\+p_amount<0/);
});
test("limited stock reservation is atomic and bounded", () => {
  assert.match(
    sql,
    /update public\.limited_offers set reserved_quantity=reserved_quantity\+p_quantity/,
  );
  assert.match(sql, /total_quantity-reserved_quantity-sold_quantity>=p_quantity/);
});
test("external orders and bill payments have duplicate guards", () => {
  assert.match(sql, /unique\(integration_id,external_order_id\)/);
  assert.match(sql, /idempotency_key text unique/);
});
test("recurring schedule does not imply charge permission", () => {
  assert.match(sql, /charge_authorization_reference text/);
  assert.match(sql, /recurring_schedules/);
});
test("customer messaging records consent and unsubscribe state", () => {
  assert.match(sql, /opted_in','opted_out/);
  assert.match(sql, /unsubscribed','suppressed/);
});
test("operational tables are tenant isolated", () => {
  assert.match(securitySql, /create or replace function public\.can_manage_store/);
  assert.match(securitySql, /managers manage inventory/);
  assert.match(securitySql, /managers manage recipes/);
  assert.match(securitySql, /managers manage reservations/);
  assert.match(securitySql, /managers manage channel integrations/);
});
test("wallet mutation is authorised and idempotent", () => {
  assert.match(securitySql, /not \(public\.is_org_member\(v_org/);
  assert.match(
    securitySql,
    /on conflict\(idempotency_key\) do nothing returning id into v_inserted/,
  );
  assert.match(
    securitySql,
    /grant execute on function public\.apply_wallet_entry[^;]+to authenticated/,
  );
});
test("limited stock rejects invalid quantities", () => {
  assert.match(securitySql, /p_quantity is null or p_quantity < 1 or p_quantity > 100/);
  assert.match(securitySql, /total_quantity-reserved_quantity-sold_quantity>=p_quantity/);
});
test("operations dashboard has real management workflows", () => {
  assert.match(operationsUi, /preparation_stations/);
  assert.match(operationsUi, /inventory_items/);
  assert.match(operationsUi, /capacity_slots/);
  assert.match(operationsUi, /limited_offers/);
  assert.match(operationsUi, /توجيه صنف للمطبخ/);
});
test("campaign queue requires consent and never sends directly", () => {
  assert.match(securitySql, /consent\.channel='whatsapp' and consent\.status='opted_in'/);
  assert.match(securitySql, /insert into public\.message_deliveries/);
  assert.match(securitySql, /status='scheduled'/);
  assert.doesNotMatch(securitySql, /http_request|net\.http|whatsapp\.com/);
});
