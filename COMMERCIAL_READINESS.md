# Commercial-readiness implementation — 2026-09-13

**Release status: IN PROGRESS / NOT APPROVED FOR COMMERCIAL RELEASE.**
Changes below are local. Pending migrations were exercised in a transaction against the linked
database and rolled back, not installed. No new financial collection, live message, or paid
service was created. Do not deploy the frontend before its migrations and managed-account
function have passed a coordinated release review.

## Requirement matrix

| Requirement | Implemented locally | Evidence / remaining gap |
|---|---|---|
| Tenant isolation and invitations | Removed direct sensitive writes; composite invitation tenant FK; acceptance independent check; revoke RPC; unsafe reservations disabled | Synthetic two-restaurant integration passes: cross-tenant read/write denial, invitation acceptance/replay and kitchen escalation denial. Broader exhaustive role matrix remains. |
| Balances and ledgers | Direct loyalty/wallet ledger mutation revoked; wallet replay conflicts rejected | Integration passes debit, repeat debit, conflict, direct balance denial. Existing loyalty adjustment restrictions preserved. |
| Kitchen recovery | Account/store scoped queue, CAS command RPC, authoritative reconnect fetch, failed replay still refreshes orders, no healthy status before success | Five behavioral tests and DB CAS/replay/stale/cross-tenant tests pass. Real browser network-outage journey remains unverified. |
| Subscriptions | Dated entitlement check; idempotent audited manual collection; suspension/reactivation; plan changes no longer activate | DB tests pass remaining paid time, replay, expiration boundary, suspension/reactivation. No actual collection performed. |
| Paid addons | Restaurant purchase toggles withheld; direct entitlement write restricted to platform | Existing data preserved. Purchased limit enforcement is not offered. |
| Restaurant payment | Cash/manual bank transfer only; Apple Pay control disabled; health display no longer asserts provider connection | No selected/verified card integration. No electronic refunds or payment readiness claimed. |
| Reports | Server aggregation, completed-only sales, recorded refunds, paginated customers, captured discount snapshot for new items | DB partial/full refund, cancellation, date-boundary tests pass. Historical missing discounts explicitly marked unknown. |
| Campaigns | Destination product stored on campaign and tenant-validated; metrics aligned with completed sales | DB saved destination/cross-store product tests pass. UI copying multiple campaign links after reload remains. |
| Onboarding | Atomic organization/subscription/store RPC, repeat-safe request, intended-owner flag, atomic owner activation/revocation | DB onboarding replay and actual owner membership/revocation pass. External Auth first-login/password setup and intermediate-failure recovery need E2E verification. |
| Sales/support | Dedicated `/platform-info` route, live plan limits, configured-contact-only inquiry link, support reference/status flow | Page visually checked at 390px. Contact/business/support hours missing. Support authenticated journey not tested live. Custom-domain resolver untouched. |
| Notifications | Open operational incident deduplication; expiry refresh and renewal resolution | Local SQL only. Expiry refresh is dashboard-triggered, not a scheduled unattended monitor. No outbound messages. |
| Operations | Explicit demo mode; missing config fails; database-sensitive `/api/health`; Render health path | Missing-config local HTTP 500 verified. Actual Render plan and health monitoring not verified: dashboard requires sign-in. |
| Backups/restoration | Coverage requirements documented below | NOT implemented/verified. No isolated restoration environment available. No claim of active backups. |
| Market/legal | Saudi launch and manual SAR subscription collection explicit; no Egypt/Apple Pay claims | Verified operator identity, contact and legal review still required; existing policy text is not a compliance certification. |

## Verification performed

Support isolation SQL tests now run in the rollback suite: restaurant administrators can
create/read their own open ticket with a reference; cannot read/create another store's
ticket even within the same organization; cannot forge the requester or resolve tickets.
Platform status resolution succeeds while editing original requester details is denied.
The first fixture run was rejected by the subscription requirement; adding an active
synthetic subscription corrected the fixture, and the full suite passed with rollback.
No live support ticket was retained. Browser support submission remains unverified.

2026-09-14: expanded linked rollback tests keep the same authenticated kitchen subject
before and after account revocation. Baseline order read succeeds; after revocation order
read/write fails; reset completion alone grants no access; activation restores only kitchen
access, not admin/organization permissions. Full rollback suite passed. Kitchen recovery
now clears cached orders and sets AUTH_REQUIRED when its access recheck fails, rather than
leaving previously fetched customer data visible. This acts at recheck time, not as an
instant remote wipe; a disconnected device cannot learn about a new revocation immediately.
The browser cache-clearing change remains local and requires rebuild/deployment.

Admin feature visibility now checks subscription start/end dates as well as active/trial
status, instead of trusting status alone. The local eligibility helper rejects missing or
malformed dates, includes the start date and excludes the end date. This is UI gating,
not a replacement for database authorization; browser clock changes cannot grant DB access.
This frontend change still requires a rebuilt deployment.

Latest activation failure simulation: the Edge activation handler now uses the tested
`activation.mjs` sequence. Ten behavioral tests cover provider errors, thrown network
failures and absent results at each of its three steps, plus complete success. A failed
step stops subsequent calls, raw provider errors are not exposed, and uncertain writes
are not automatically retried. Malformed null/array request bodies are rejected explicitly.
All 54 local tests and scoped Edge/test lint pass. This is mocked failure testing, not
a real Auth end-to-end or concurrent-write test; no user passwords were changed and
the Edge update remains undeployed.

### Latest local browser / database run

- Authenticated Chrome admin login verified. General settings/hours render correctly.
  Subscription screen incorrectly fell back to starter/unconfigured for a store-only admin,
  although database subscription is active. Organization/subscription RLS requires org membership.
- Pending migration 20260913000100 adds authorized store_subscription_summary, exposing only
  plan metadata/status/dates to store admins, not billing or ownership. Admin loader uses it
  when full subscription rows are RLS-hidden. Tests cover cross-store denial and store-only
  administrator access while raw billing rows remain hidden. Installed ONLY migration
  20260913000100 transactionally in linked Supabase and recorded its version. Other readiness
  migrations remain pending. Rebuilt/restarted local server on 8081 successfully. Reloading
  Chrome initially showed login again; subsequent user sign-in verified the Professional
  active plan and successfully loaded loyalty settings. No Render
  frontend or Edge Function deployment occurred.

- Built Node server on 127.0.0.1:8081: health reports database=true.
- Real menu data rendered; discounted ESPRESSO 8.10 SAR plus LARGE option 2.00 SAR
  yielded a 10.10 SAR cart with the correct selection. No browser order submitted.
- Unauthenticated admin shows login; kitchen denies access; loyalty shows Google entry.
- Both commercial-readiness and loyalty-transaction SQL integration suites passed again,
  with ROLLBACK. Loyalty verified earning, replay, worker lookup, owner adjustment restriction,
  redemption/replay, insufficient balance, cross-store denial, cancellation and RLS.
- Authenticated subscription/loyalty reads are verified; broader write journeys remain
  unfinished. Physical mobile camera still unverified. No credentials requested in chat.
- Extended SQL regression passed: revocation is repeat-safe, a revoked invitation token
  stays invalid after reinviting the same email, and kitchen users cannot revoke invitations.
  The complete readiness suite passed and all synthetic fixtures were rolled back.

- `npm run build:render`: passed (client + server). The Render build command now explicitly
  selects `node-server`, avoiding the tooling's Cloudflare default.
- Built server started locally on port 8081: `/api/health` returned
  `{"status":"ok","database":true}` and `/platform-info` returned HTTP 200.
- `npm run test:mvp`: 44 passed, 0 failed. Existing source-pattern tests are supplementary;
  the five new kitchen recovery tests execute the actual reconciliation helper.
- `npx tsc --noEmit`: **passes** after the full application typing remediation. No compiler
  settings weakened and no TypeScript suppression comments added.
- `npx eslint src scripts tests supabase/functions`: passes, no warnings or errors.
  The broader `npm run lint` includes historical artifact scripts under outputs/tmp;
  those were preserved and that root-wide command is not claimed clean.
- Scanner lifecycle: three behavioral tests verify late startup cancellation, duplicate
  frame suppression and early-frame camera stop. Scanner initialization now runs after video
  mount; stale responses are ignored after cancellation. Physical mobile camera is not tested.
- Targeted ESLint: 20 changed/new application paths passed with no warnings/errors.
- `scripts/Test-CommercialReadiness.ps1 -SupabaseExecutable <absolute-cli-exe>`: passed
  against linked Supabase with BEGIN/ROLLBACK and synthetic fixture users/restaurants.
  This runner requires the pending migrations NOT to have been installed yet.
- Browser: local sales page and kitchen login inspected at 390×844, plus default desktop
  viewport. Menu loaded actual LA GAUFRES items and offers. Authenticated administration,
  support, subscription collection, and physical network interruption are NOT verified.
- Local app without Supabase configuration returned a clear configuration error instead
  of silently serving demo data. The local server was then restarted with the public project
  URL and publishable key to inspect the public interface.

## Pending migrations and main files

- `20260912000400_commercial_authorization.sql`
- `20260912000500_kitchen_commands.sql`
- `20260912000600_campaign_destinations.sql`
- `20260912000700_subscription_lifecycle.sql`
- `20260912000800_sales_reporting.sql`
- `20260912000900_owner_setup.sql`
- `20260912001000_support_tickets.sql`
- `20260912001100_actionable_incidents.sql`
- `useKitchenData`, `kitchenRecovery`, `usePlatformData`, `useSalesReport`, `useAdminData`
- `SubscriptionCollection`, `SupportTickets`, `PlatformStaffAccounts`, `ReportPeriod`
- Platform, Kitchen, OrderCard, PrintReceipt, reports/customers/campaigns/billing/health screens
- `supabase/functions/manage-staff/index.ts`, `src/lib/supabase.ts`, `render.yaml`
- `scripts/build-render.mjs`, `package.json`: fail-fast configured Node server build.
- `/platform-info`, `/api/health`, generated route tree and tests

## Runtime and release configuration

2026-09-14 authenticated Render dashboard inspection: existing service
srv-daeihe8n74is73e0qto0 is Node, Free, Frankfurt, linked to hmbegy-byte/menu main.
Live commit and remote main both remain bf07d3e994107dcc130d0f3518a935098df66cfd.
Build command is npm install --no-audit --no-fund && npm run build:render;
start command is npm run start:render. Health Check Path is currently empty in the
actual dashboard (the local blueprint alone has /api/health). No deploy or settings
change was triggered. Existing free service is confirmed; no paid upgrade selected.
Current PATH exposes none of docker, pg_dump or psql. An isolated restoration/Auth
test environment is still required before claiming those release gates complete.

Latest local follow-up: corrected reactive saved-form baseline, added concrete types to
delivery/hours/login/image compression, and normalized single-store custom-domain joins
with two behavioral tests (object/array shape and invalid/ambiguous rejection).
Catalog/products/options/offers/order history now have concrete types; editing nested
product choices no longer mutates original product data before save. History distinguishes
ready from completed; addon prices use the store currency instead of hardcoded EGP.
Corrected 115 compiler-reported index-signature accesses without changing compiler settings.
Node production build and full TypeScript now pass after fixing an hours-model filename
collision and completing legacy admin view typing. All 44 tests pass; lint across application,
scripts, tests and edge functions is clean. Authenticated end-to-end verification remains
unfinished. No deployment has occurred.

Required at frontend build time:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (publishable key, never a service-role key)
- `VITE_DEMO_MODE=true` **only** for explicitly isolated demo runs; leave unset/false for production.

Public information, only after owner verification:

- `VITE_PUBLIC_CONTACT_EMAIL`
- `VITE_SUPPORT_HOURS`

The owner permits alternatives to Render; keep the existing live service until a replacement
passes runtime and load tests. Cloudflare Workers is a candidate, not an approved migration:
its free dynamic-request allowance is 100,000/day with 10ms CPU per invocation
(https://developers.cloudflare.com/workers/platform/limits/). Measure this application's SSR
CPU and bundle compatibility before selecting it. Vercel Hobby is not appropriate for this
commercial product (https://vercel.com/docs/plans/hobby). No alternative has been deployed.
Existing blueprint's `plan: free` is not evidence of the
actual live service plan. Inspect the signed-in dashboard and document runtime/preset,
environment, current deploy commit, health path, restarts and service limits before approval.
Keep `NITRO_PRESET=node-server`, configured host, and established Render build/start commands.
Deploy the managed-account function only together with migration 009; it authenticates its
caller internally. Do not expose the service-role key to the browser.

## Financial definitions

- Period is creation time `[from, to)`; report UI uses Saudi UTC+03:00 calendar days.
- Pending/preparing/ready and canceled orders do not contribute to sales.
- Completed order net = max(total amount − recorded refund, 0); totals include tax/delivery.
- Completed count and average include fully refunded completed orders (zero net).
- Gross-before-discount and discounts only cover orders with a captured discount value.
  Old unknown values are not backfilled from today's product prices.
- Top product quantities exclude fully refunded orders; partial order-level refund amounts
  cannot establish which physical product units were returned.
- These are sales values, not cash collected and not profit. No card refund is executed.
- Manual subscription renewal adds a fixed number of days to remaining active/paused paid
  time; trial time is not purchased time. A repeated reference does not extend twice.

## Backup and restoration gate

Before accepting real restaurant operations, agree an RPO/RTO and storage/retention location.
Back up database schema, application records and required auth/permission configuration,
and separately copy every uploaded storage object plus its bucket/path/metadata manifest.
A database dump alone is not proof of an image/file backup.

Restore synthetic data into a separately authorized nonproduction database and storage
location. Verify row counts, tenant permissions, ledger totals, object checksums and broken
references; run order/onboarding tests against the restored environment. Keep signed-off
test results and a runbook. No Docker/PostgreSQL executable was available in this workspace
session; no isolated restore has been executed. Do not restore over production or copy real
customer data into an unapproved environment.

## Remaining release gates

Authenticated local browser verification on 2026-09-13, after deploying only
`20260913000100_store_subscription_summary` and rebuilding/restarting localhost:8081:
the demo store-only administrator sees the Professional plan as active, ending
2026-10-06. The loyalty navigation is present and its program, earning-rule and
reward controls load successfully. This was read-only UI verification: no settings,
balances, orders or rewards were changed. Render frontend and the other pending
readiness migrations/Edge functions have not been deployed by this verification.

1. Retain the passing TypeScript, scoped source lint and build checks during remaining E2E fixes.
2. Complete broader multi-role tests plus UI account creation,
   first login, owner/staff permissions, support, campaign-copy and outage journeys.
3. Review account setup reset/disable concurrency and external Auth retry failures.
   Reset completion now uses a database access revision: a newer disable/reset invalidates
   an older completion, and finishing a reset does not grant membership. Linked rollback
   tests pass stale-reset denial, current completion, replay denial and service-only grants.
   Migration 009 and manage-staff must be released together. External Auth password writes
   are not transactional with Postgres; overlapping Auth writes and metadata completion still
   require further review/E2E verification. Version-bound activation now rejects stale account
   snapshots after reset or disable. SQL tests pass current activation, repeat activation without
   duplicate membership, stale activation denial, disabled owner denial and service-only grants.
   The complete rollback suite and 44 local tests pass; Edge source lint passes.
   These fixes have not been deployed.
4. Verify hosting and credentials in the actual Render account; stage coordinated deployment.
5. Supply verified business/contact details and obtain appropriate policy review.
6. Complete backup/isolated restore and unattended monitoring verification.

The eventual sellable scope is restaurant-branded menu, direct cash/manual-transfer ordering,
tracking and entitled kitchen operations, manual platform subscriptions and documented sales
reports. **This document is not authorization to sell or a production-readiness certificate.**
