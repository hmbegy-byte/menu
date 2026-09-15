import test from "node:test";
import assert from "node:assert/strict";
import { domainStoreSlug } from "../src/lib/domainDestination.mjs";

test("custom domain accepts either single-store join representation", () => {
  assert.equal(domainStoreSlug({ slug: "la-gaufres" }), "la-gaufres");
  assert.equal(domainStoreSlug([{ slug: "demo" }]), "demo");
});

test("custom domain refuses missing, ambiguous or malformed destinations", () => {
  for (const value of [
    null,
    {},
    [],
    [{ slug: "a" }, { slug: "b" }],
    { slug: "" },
    { slug: "../platform" },
    { slug: "a?b" },
    { slug: 3 },
  ]) {
    assert.equal(domainStoreSlug(value), null);
  }
});
