import assert from "node:assert/strict";
import test from "node:test";
import {
  isHostedPlatformHost,
  safeInstalledStartPath,
  safeRememberedStore,
} from "../src/lib/hostedAppDestination.mjs";

test("installed app recognizes the shared Render host", () => {
  assert.equal(isHostedPlatformHost("flavor-flow-saudi.onrender.com"), true);
  assert.equal(isHostedPlatformHost("www.flavor-flow-saudi.onrender.com"), true);
  assert.equal(isHostedPlatformHost("restaurant.example"), false);
});

test("installed kitchen and menu apps preserve their exact safe destination", () => {
  assert.equal(safeInstalledStartPath("/kitchen/Demo"), "/kitchen/demo");
  assert.equal(safeInstalledStartPath("/s/la-gaufres"), "/s/la-gaufres");
  assert.equal(safeInstalledStartPath("/platform"), null);
  assert.equal(safeInstalledStartPath("/kitchen/../platform"), null);
});

test("installed app resumes the last safe restaurant slug", () => {
  assert.equal(safeRememberedStore("Demo"), "demo");
  assert.equal(safeRememberedStore("la-gaufres"), "la-gaufres");
  assert.equal(safeRememberedStore("../platform"), "demo");
});
