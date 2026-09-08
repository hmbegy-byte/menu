import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLoyaltyPhone } from '../src/lib/loyaltyPhone.mjs';
test('Saudi phone formats resolve to the same lookup value', () => {
  for (const value of ['0501234567', '٠٥٠١٢٣٤٥٦٧', '966501234567', '+966 50-123-4567']) {
    assert.equal(normalizeLoyaltyPhone(value), '+966501234567');
  }
});
test('international numbers are supported without inventing a country code', () => {
  assert.equal(normalizeLoyaltyPhone('+201012345678'), '+201012345678');
  assert.equal(normalizeLoyaltyPhone('01012345678'), null);
});
test('invalid numbers and database filter syntax cannot enter phone lookup', () => {
  for (const value of ['', null, '123', '+0123456789', '+966501234567,auth_user_id.not.is.null', '+1234567890123456']) {
    assert.equal(normalizeLoyaltyPhone(value), null);
  }
});
