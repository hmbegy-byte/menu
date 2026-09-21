import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const access = readFileSync(new URL("../src/lib/access.ts", import.meta.url), "utf8");
const kitchen = readFileSync(new URL("../src/pages/KitchenGate.tsx", import.meta.url), "utf8");
const admin = readFileSync(new URL("../src/pages/AdminGate.tsx", import.meta.url), "utf8");

test("staff login normalizes restaurant slug and username before authentication", () => {
  assert.match(access, /value\.trim\(\)\.toLowerCase\(\)/);
  assert.match(access, /normalizedUsername.*normalizedSlug.*@staff\.flavor-flow\.invalid/s);
  assert.match(access, /\.eq\("stores\.slug", normalizedSlug\)/);
});

test("kitchen and admin navigate with the normalized restaurant slug", () => {
  assert.match(kitchen, /\/kitchen\/\$\{normalizedSlug\}/);
  assert.match(admin, /\/admin\/\$\{normalizedSlug\}/);
});
