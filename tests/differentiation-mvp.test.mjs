import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../supabase/migrations/20260907000200_differentiation_mvp.sql", import.meta.url), "utf8");
const cart = readFileSync(new URL("../src/components/menu/CartSheet.tsx", import.meta.url), "utf8");

test("campaign conversion is unique per order", () => {
  assert.match(migration, /unique\(order_id\)/);
  assert.match(migration, /on conflict\(order_id\) do nothing/);
});

test("campaign ownership is checked against the submitted store", () => {
  assert.match(migration, /where store_id=p_store_id and slug=p_campaign_slug and is_active/);
  assert.match(migration, /رابط الحملة غير صالح لهذا المطعم/);
});

test("campaign metrics exclude cancellations and subtract refunds", () => {
  assert.match(migration, /o\.status<>'cancelled'/);
  assert.match(migration, /o\.total_amount-o\.refunded_amount/);
});

test("reorder lookup requires both store and unguessable tracking token", () => {
  assert.match(migration, /where o\.store_id=p_store_id and o\.tracking_token=p_tracking_token/);
  assert.doesNotMatch(migration, /customer_phone=p_/);
});

test("usual orders use a separate unguessable access token", () => {
  assert.match(migration, /access_token uuid not null default gen_random_uuid\(\) unique/);
  assert.match(migration, /u\.store_id=p_store_id and u\.access_token=p_access_token/);
});

test("option selection bounds and availability are enforced in the database", () => {
  assert.match(migration, /v_count < v_min or v_count > v_max/);
  assert.match(migration, /is_available/);
  assert.match(migration, /new\.unit_price := v_product\.price/);
});

test("checkout ignores client prices and sends structured option identifiers", () => {
  assert.match(cart, /selectedOptions/);
  assert.match(cart, /create_order_v4/);
  assert.match(migration, /select \* into v_product from public\.products/);
});
