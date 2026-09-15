import test from "node:test";
import assert from "node:assert/strict";
import {
  adjustDemoLoyaltyBalance,
  createDemoLoyaltyCustomer,
  redeemDemoLoyaltyReward,
} from "../src/lib/demoLoyalty.mjs";

test("demo loyalty creates a scannable customer and adjusts balances", () => {
  const customer = createDemoLoyaltyCustomer("عميل تجربة", "+966501234567");
  assert.equal(customer.phone, "+966501234567");
  assert.ok(customer.qr_token);
  const credited = adjustDemoLoyaltyBalance(customer, 120, "points");
  assert.equal(credited.points_balance, 120);
  assert.equal(adjustDemoLoyaltyBalance(credited, -200, "points").points_balance, 0);
});

test("demo loyalty redemption deducts once and rejects insufficient balance", () => {
  const customer = { points_balance: 120, stamps_balance: 2 };
  const reward = { points_cost: 100, stamps_cost: 1 };
  assert.deepEqual(redeemDemoLoyaltyReward(customer, reward), {
    points_balance: 20,
    stamps_balance: 1,
  });
  assert.throws(
    () => redeemDemoLoyaltyReward({ points_balance: 20, stamps_balance: 0 }, reward),
    /الرصيد غير كافٍ/,
  );
});
