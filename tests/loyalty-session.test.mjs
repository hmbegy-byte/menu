import test from "node:test";
import assert from "node:assert/strict";
import { isManagedStaffEmail } from "../src/lib/loyaltySession.mjs";

test("recognizes managed restaurant staff identities", () => {
  assert.equal(isManagedStaffEmail("abdo.demo.demo@staff.flavor-flow.invalid"), true);
  assert.equal(isManagedStaffEmail("  USER@STAFF.FLAVOR-FLOW.INVALID  "), true);
});

test("does not classify customer Google accounts as staff", () => {
  assert.equal(isManagedStaffEmail("customer@gmail.com"), false);
  assert.equal(isManagedStaffEmail(undefined), false);
  assert.equal(isManagedStaffEmail("staff.flavor-flow.invalid@gmail.com"), false);
});
