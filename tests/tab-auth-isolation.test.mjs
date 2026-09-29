import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("restaurant administration auth is isolated per browser tab", () => {
  const source = readFileSync(new URL("../src/lib/supabase.ts", import.meta.url), "utf8");

  assert.match(source, /window\.sessionStorage\.getItem/);
  assert.match(source, /storage:\s*tabAuthStorage/);
  assert.match(source, /storageKey:\s*"flavor-flow-tab-auth"/);
});
