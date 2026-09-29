import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260929000100_demo_loyalty_default_rule.sql", import.meta.url),
  "utf8",
);

test("demo loyalty default is explicit and recovery is idempotent", () => {
  assert.match(migration, /'points_per_currency', 1, 'points', 5/);
  assert.match(migration, /o\.status = 'completed'/);
  assert.match(migration, /o\.created_at >= c\.joined_at/);
  assert.match(migration, /on conflict \(idempotency_key\) do nothing/);
  assert.match(migration, /unique_customer\.joined_at is not null/);
});
