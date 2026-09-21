import assert from "node:assert/strict";
import test from "node:test";
import { encodeLoyaltyQr, parseLoyaltyQr } from "../src/lib/loyaltyQr.mjs";

const customerId = "123e4567-e89b-12d3-a456-426614174000";
const token = "0123456789abcdef0123456789abcdef";

test("compact loyalty QR round-trips with less visual density", () => {
  const encoded = encodeLoyaltyQr(customerId, token);
  assert.equal(encoded, `ffl1:${customerId}:${token}`);
  assert.deepEqual(parseLoyaltyQr(encoded), { customerId, token });
});

test("scanner keeps accepting existing customer QR cards", () => {
  assert.deepEqual(parseLoyaltyQr(JSON.stringify({ a: customerId, t: token })), {
    customerId,
    token,
  });
});

test("scanner rejects unrelated and malformed codes", () => {
  assert.equal(parseLoyaltyQr("https://example.com"), null);
  assert.equal(parseLoyaltyQr("ffl1:not-a-customer:not-a-token"), null);
});
