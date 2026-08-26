import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
const Admin = lazy(() => import("../pages/Admin"));

export const Route = createFileRoute("/admin/$store_slug")({
  component: AdminRoute,
});

function AdminRoute() {
  const { store_slug } = Route.useParams();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">جاري تحميل لوحة الإدارة…</div>
      }
    >
      <Admin storeSlug={store_slug} />
    </Suspense>
  );
}
