import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { requiresOrganizationAccess } from "../src/lib/adminSectionAccess.mjs";

const adminSource = readFileSync(new URL("../src/pages/Admin.tsx", import.meta.url), "utf8");

test("organization-level admin sections are explicitly guarded", () => {
  assert.equal(requiresOrganizationAccess("retention"), true);
  assert.equal(requiresOrganizationAccess("loyalty"), true);
  assert.equal(requiresOrganizationAccess("white-label"), true);
  assert.equal(requiresOrganizationAccess("orders"), false);
  assert.match(adminSource, /!adminData\.organization\?\.id/);
  assert.match(adminSource, /OrganizationAccessNotice/);
});

test("one broken admin section cannot take down the whole dashboard", () => {
  assert.match(adminSource, /class AdminSectionBoundary/);
  assert.match(adminSource, /getDerivedStateFromError/);
  assert.match(adminSource, /بقية لوحة الإدارة ما زالت تعمل/);
});
