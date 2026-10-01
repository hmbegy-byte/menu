import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("restaurant administration auth is isolated per browser tab", () => {
  const source = readFileSync(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");

  assert.match(source, /window\.sessionStorage\.getItem/);
  assert.match(source, /storage:\s*tabAuthStorage/);
  assert.match(source, /storageKey:\s*"flavor-flow-tab-auth"/);
});

test("platform login normalizes the owner email and clears stale tab auth", () => {
  const source = readFileSync(new URL("../src/lib/access.ts", import.meta.url), "utf8");

  assert.match(source, /email\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /signOut\(\{ scope: "local" \}\)/);
  assert.match(source, /email: normalizedEmail/);
});
