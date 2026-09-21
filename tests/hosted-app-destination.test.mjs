import assert from "node:assert/strict";
import test from "node:test";
import { isHostedPlatformHost, safeRememberedStore } from "../src/lib/hostedAppDestination.mjs";

test("installed app recognizes the shared Render host", () => {
  assert.equal(isHostedPlatformHost("flavor-flow-saudi.onrender.com"), true);
  assert.equal(isHostedPlatformHost("www.flavor-flow-saudi.onrender.com"), true);
  assert.equal(isHostedPlatformHost("restaurant.example"), false);
});

test("installed app resumes the last safe restaurant slug", () => {
  assert.equal(safeRememberedStore("Demo"), "demo");
  assert.equal(safeRememberedStore("la-gaufres"), "la-gaufres");
  assert.equal(safeRememberedStore("../platform"), "demo");
});
