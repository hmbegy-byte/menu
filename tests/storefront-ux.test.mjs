import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getMenuOrderMethods, getMenuOrderStatus } from "../src/lib/storefrontView.mjs";

const menu = readFileSync(new URL("../src/routes/s.$store_slug.tsx", import.meta.url), "utf8");
const installer = readFileSync(
  new URL("../src/components/PwaInstaller.tsx", import.meta.url),
  "utf8",
);
const slideshow = readFileSync(
  new URL("../src/components/menu/OffersSlideshow.tsx", import.meta.url),
  "utf8",
);

test("storefront has no seafood-specific template copy or assets", () => {
  assert.doesNotMatch(menu, /طازج من المزاد|مشويات وبحريات|demo-seafood|demo-grilled/);
  assert.match(menu, /settings\?\.menuTagline/);
  assert.match(menu, /store\.legal\?\.nationalAddress/);
});

test("order state distinguishes hours from a temporary pause", () => {
  assert.deepEqual(getMenuOrderStatus({ acceptingOrders: true, isWithinWorkingHours: false }), {
    label: "مغلق حسب ساعات العمل",
    tone: "closed",
  });
  assert.deepEqual(
    getMenuOrderStatus({
      acceptingOrders: true,
      isWithinWorkingHours: true,
      isTemporarilyPaused: true,
      pauseReason: "ضغط طلبات",
    }),
    { label: "ضغط طلبات", tone: "paused" },
  );
});

test("order methods only expose configured capabilities", () => {
  assert.deepEqual(
    getMenuOrderMethods({ deliveryEnabled: false, dineInEnabled: false, curbsideEnabled: false }),
    ["استلام من الفرع"],
  );
  assert.deepEqual(getMenuOrderMethods({ curbsideEnabled: true }), [
    "استلام من الفرع",
    "استلام من السيارة",
    "توصيل",
    "داخل المطعم",
  ]);
});

test("install prompt yields to cart and remembers session dismissal", () => {
  assert.match(menu, /flavor-flow:checkout-active/);
  assert.match(installer, /checkoutActive/);
  assert.match(installer, /sessionStorage\.setItem\("pwa-install-hidden"/);
});

test("offers leave no reserved space and respect reduced motion", () => {
  assert.match(slideshow, /if \(banners\.length === 0\) return null/);
  assert.match(slideshow, /prefers-reduced-motion: reduce/);
  assert.match(slideshow, /line-clamp-2/);
  assert.match(menu, /activeOffers\.length > 0/);
});

test("desktop menu width is bounded and product controls are named", () => {
  assert.match(menu, /max-w-6xl/);
  assert.match(menu, /sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(menu, /aria-label=.*اختيار الخيارات/);
});
