import test from "node:test";
import assert from "node:assert/strict";
import { subscriptionEligible } from "../src/lib/subscriptionEligibility.mjs";

const current = {
  status: "active",
  current_period_start: "2026-09-13",
  current_period_end: "2026-10-06",
};
const check = (value) => subscriptionEligible(value, "2026-09-13");
test("subscription includes start date but excludes end date", () => {
  assert.equal(check(current), true);
  assert.equal(check({ ...current, status: "trial" }), true);
  assert.equal(check({ ...current, current_period_start: "2026-09-14" }), false);
  assert.equal(check({ ...current, current_period_end: "2026-09-13" }), false);
});
test("subscription denies inactive and missing periods", () => {
  for (const status of ["paused", "cancelled", "past_due", "unknown", null])
    assert.equal(check({ ...current, status }), false);
  assert.equal(check(null), false);
  for (const field of ["current_period_start", "current_period_end"])
    for (const value of [null, undefined, "", "2026-02-30", "not-a-date"])
      assert.equal(check({ ...current, [field]: value }), false);
});
