import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import StoreSlugRedirect from "../components/StoreSlugRedirect";
const Admin = lazy(() => import("../pages/Admin"));

export const Route = createFileRoute("/admin/$store_slug")({
  component: AdminRoute,
});

function AdminRoute() {
  const { store_slug } = Route.useParams();
  return (
    <StoreSlugRedirect slug={store_slug} area="admin">
      <Suspense
        fallback={
          <div className="min-h-screen grid place-items-center">جاري تحميل لوحة الإدارة…</div>
        }
      >
        <Admin storeSlug={store_slug} />
      </Suspense>
    </StoreSlugRedirect>
  );
}
