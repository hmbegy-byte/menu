import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { expensesToCsv, isValidGoogleReviewUrl } from "../src/lib/restaurantOperations.mjs";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/20260915000200_restaurant_operations_upgrade.sql",
    import.meta.url,
  ),
  "utf8",
);
const boardGuardSql = readFileSync(
  new URL("../supabase/migrations/20260915000300_order_board_invalid_token.sql", import.meta.url),
  "utf8",
);
const cart = readFileSync(new URL("../src/components/menu/CartSheet.tsx", import.meta.url), "utf8");
const kitchen = readFileSync(new URL("../src/hooks/useKitchenData.ts", import.meta.url), "utf8");
const board = readFileSync(
  new URL("../src/routes/display.$access_token.tsx", import.meta.url),
  "utf8",
);
const tracking = readFileSync(
  new URL("../src/routes/track.$tracking_token.tsx", import.meta.url),
  "utf8",
);

test("Google review links are restricted to supported HTTPS hosts", () => {
  assert.equal(isValidGoogleReviewUrl("https://g.page/example/review"), true);
  assert.equal(isValidGoogleReviewUrl("https://maps.app.goo.gl/abc"), true);
  assert.equal(isValidGoogleReviewUrl("http://g.page/example"), false);
  assert.equal(isValidGoogleReviewUrl("https://g.page.evil.test/example"), false);
});

test("expense CSV preserves Arabic and escapes spreadsheet content", () => {
  const csv = expensesToCsv([
    {
      expense_date: "2026-09-15",
      category: "مواد, خام",
      description: 'فاتورة "أ"',
      amount: 12.5,
      reporting_scope: "store_only",
    },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"مواد, خام"/);
  assert.match(csv, /"فاتورة ""أ"""/);
});

test("curbside checkout and kitchen acknowledgement are complete", () => {
  assert.match(cart, /create_order_v5/);
  assert.match(cart, /p_pickup_method/);
  assert.match(kitchen, /acknowledge_curbside_arrival/);
  assert.match(sql, /ALREADY_RECORDED/);
  assert.match(sql, /checkout_context_hash/);
  assert.match(sql, /v_existing_hash<>v_hash/);
  assert.match(tracking, /writeDemo\("orders"/);
});

test("public order board exposes no customer data", () => {
  assert.match(sql, /returns table\(order_number bigint,status text,updated_at timestamptz\)/);
  assert.doesNotMatch(board, /customer_name|customer_phone/);
  assert.match(board, /useState<boolean \| null>\(null\)/);
  assert.doesNotMatch(board, /useState\(\(\) => navigator\.onLine\)/);
  assert.match(board, /"message" in cause/);
  assert.match(boardGuardSql, /رابط الشاشة غير صالح أو متوقف/);
});

test("inventory deduction is optional, transactional and idempotent", () => {
  assert.match(sql, /settings->>'inventoryEnabled'/);
  assert.match(sql, /p_target='preparing'.*consume_order_inventory/s);
  assert.match(sql, /idempotency_key=v_key/);
  assert.doesNotMatch(sql, /p_target='cancelled'.*on_hand\s*=\s*on_hand\+/s);
});

test("profit report excludes unallocated shared expenses and flags missing inputs", () => {
  assert.match(sql, /reporting_scope='store_only'/);
  assert.match(sql, /incomplete_cost_orders/);
  assert.match(sql, /not accounting net profit/);
});
