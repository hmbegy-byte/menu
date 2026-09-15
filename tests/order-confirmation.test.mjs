import test from "node:test";
import assert from "node:assert/strict";
import { parseOrderReceipt } from "../src/lib/orderConfirmation.mjs";
const receipt = {
  id: "11111111-1111-4111-8111-111111111111",
  tracking_token: "22222222-2222-4222-8222-222222222222",
  order_number: 42,
  total_amount: 12.5,
};
test("checkout success uses the authoritative receipt amount", () => {
  assert.equal(parseOrderReceipt([receipt]).total_amount, 12.5);
  assert.equal(parseOrderReceipt({ ...receipt, total_amount: "0" }).total_amount, 0);
});
test("checkout never fabricates success for missing or malformed server result", () => {
  for (const value of [
    null,
    [],
    {},
    { ...receipt, id: "bad" },
    { ...receipt, tracking_token: null },
    { ...receipt, total_amount: null },
    { ...receipt, total_amount: -1 },
    { ...receipt, total_amount: "NaN" },
    { ...receipt, order_number: 0 },
  ])
    assert.throws(() => parseOrderReceipt(value));
});
test("checkout rejects coerced booleans, arrays and whitespace as receipt numbers", () => {
  for (const field of ["total_amount", "order_number"]) {
    for (const value of [true, false, [], [1], {}, "   "]) {
      assert.throws(() => parseOrderReceipt({ ...receipt, [field]: value }));
    }
  }
});
