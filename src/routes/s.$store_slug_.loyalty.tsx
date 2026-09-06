import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LoyaltyPage = lazy(() => import("../pages/Loyalty"));

export const Route = createFileRoute("/s/$store_slug_/loyalty")({
  component: LoyaltyRoute,
});

function LoyaltyRoute() {
  const { store_slug } = Route.useParams();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">جاري تحميل نظام الولاء...</div>
      }
    >
      <LoyaltyPage storeSlug={store_slug} />
    </Suspense>
  );
}
