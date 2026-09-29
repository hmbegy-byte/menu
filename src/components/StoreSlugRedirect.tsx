import { useEffect, useState, type ReactNode } from "react";
import { resolveCurrentStoreSlug } from "../lib/platformBrand";

export default function StoreSlugRedirect({
  slug,
  area,
  suffix = "",
  children,
}: {
  slug: string;
  area: "s" | "admin" | "kitchen";
  suffix?: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    resolveCurrentStoreSlug(slug).then(({ currentSlug, isAlias }) => {
      if (!active) return;
      if (isAlias && currentSlug !== slug.toLowerCase()) {
        const safeSuffix = suffix ? `/${suffix.replace(/^\/+|\/+$/g, "")}` : "";
        window.location.replace(
          `/${area}/${encodeURIComponent(currentSlug)}${safeSuffix}${window.location.search}${window.location.hash}`,
        );
        return;
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [area, slug, suffix]);
  return ready ? (
    children
  ) : (
    <div className="grid min-h-screen place-items-center">جارٍ فتح الرابط الحالي…</div>
  );
}
