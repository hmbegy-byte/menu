import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isMockMode, supabase } from "../lib/supabase";
import { domainStoreSlug } from "../lib/domainDestination.mjs";
import { isHostedPlatformHost, safeInstalledStartPath } from "../lib/hostedAppDestination.mjs";
import Landing from "../pages/Landing";
import { fallbackPlatformBrand, readPublicBrand } from "../lib/platformBrand";

export const Route = createFileRoute("/")({
  loader: () => readPublicBrand(),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.meta_title || fallbackPlatformBrand.meta_title },
      {
        name: "description",
        content: loaderData?.meta_description || fallbackPlatformBrand.meta_description,
      },
    ],
  }),
  component: DomainResolver,
});

function DomainResolver() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [showLanding, setShowLanding] = useState(false);
  const brand = Route.useLoaderData();
  useEffect(() => {
    const resolve = async () => {
      const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");
      if (
        isMockMode ||
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        isHostedPlatformHost(hostname)
      ) {
        const installedStart = safeInstalledStartPath(
          localStorage.getItem("flavor-flow:installed-start"),
        );
        if (installedStart) {
          window.location.replace(installedStart);
          return;
        }
        setShowLanding(true);
        return;
      }
      const { data, error: domainError } = await supabase
        .from("custom_domains")
        .select("stores!inner(slug)")
        .eq("hostname", hostname)
        .in("status", ["verified", "active"])
        .maybeSingle();
      const slug = domainStoreSlug(data?.stores);
      if (domainError || !slug) {
        setError("هذا النطاق غير مربوط بمتجر نشط.");
        return;
      }
      navigate({
        to: "/s/$store_slug",
        params: { store_slug: slug },
        replace: true,
      });
    };
    resolve();
  }, [navigate]);
  if (showLanding) return <Landing brand={brand} />;
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-gray-50 p-4 text-center">
      <div>
        <h1 className="text-xl font-bold">{error || "جارٍ فتح قائمة المطعم…"}</h1>
        {error && <p className="mt-2 text-sm text-gray-500">تحقق من إعدادات DNS في لوحة المطعم.</p>}
      </div>
    </div>
  );
}
