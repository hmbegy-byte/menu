import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const StaffScannerPage = lazy(() => import("../pages/StaffScanner"));

export const Route = createFileRoute("/s/$store_slug_/scanner")({
  component: ScannerRoute,
});

function ScannerRoute() {
  const { store_slug } = Route.useParams();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen grid place-items-center">جاري تحميل الماسح الضوئي...</div>
      }
    >
      <StaffScannerPage storeSlug={store_slug} />
    </Suspense>
  );
}
