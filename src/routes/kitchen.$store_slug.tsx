import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const Kitchen = lazy(() => import("../pages/Kitchen"));

export const Route = createFileRoute("/kitchen/$store_slug")({
  component: KitchenRoute,
});

function KitchenRoute() {
  const { store_slug } = Route.useParams();
  return (
    <Suspense
      fallback={<div className="min-h-screen grid place-items-center">جاري تحميل شاشة المطبخ…</div>}
    >
      <Kitchen storeSlug={store_slug} />
    </Suspense>
  );
}
