import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260921000300_loyalty_awards_enrolled_members.sql", import.meta.url),
  "utf8",
);

test("automatic loyalty awards ignore legacy unjoined shadow records", () => {
  const joinedFilters = migration.match(/joined_at is not null/g) ?? [];
  assert.equal(joinedFilters.length, 2);
  assert.match(migration, /count\(\*\)[\s\S]*joined_at is not null/);
  assert.match(migration, /select id into customer[\s\S]*joined_at is not null/);
});
