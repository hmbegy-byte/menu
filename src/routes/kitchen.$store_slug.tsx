import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import StoreSlugRedirect from "../components/StoreSlugRedirect";
const Kitchen = lazy(() => import("../pages/Kitchen"));

export const Route = createFileRoute("/kitchen/$store_slug")({
  component: KitchenRoute,
});

function KitchenRoute() {
  const { store_slug } = Route.useParams();
  return (
    <StoreSlugRedirect slug={store_slug} area="kitchen">
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center">جاري تحميل شاشة المطبخ…</div>
        }
      >
        <Kitchen storeSlug={store_slug} />
      </Suspense>
    </StoreSlugRedirect>
  );
}
