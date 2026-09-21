import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(
  new URL(
    "../supabase/migrations/20260921000200_loyalty_enrolled_customer_lookup.sql",
    import.meta.url,
  ),
  "utf8",
);
const scanner = readFileSync(new URL("../src/pages/StaffScanner.tsx", import.meta.url), "utf8");

test("staff phone lookup ignores legacy unconsented shadow customers", () => {
  assert.match(sql, /c\.joined_at is not null/);
  assert.match(sql, /loyalty_phone_key\(c\.contact_phone\)=v_phone_key/);
  assert.match(sql, /c\.id=p_customer_id and c\.qr_token=p_token/);
});

test("scanner distinguishes lookup failures, missing members and ambiguous phones", () => {
  assert.match(scanner, /تعذر البحث عن العضوية/);
  assert.match(scanner, /لا توجد عضوية منضمة بهذا الرقم/);
  assert.match(scanner, /يوجد أكثر من حساب منضم بهذا الرقم/);
});
