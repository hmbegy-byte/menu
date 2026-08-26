import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isMockMode, supabase } from "../lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "قائمة المطعم الرقمية" },
      { name: "description", content: "اطلب مباشرة من قائمة المطعم الرقمية." },
    ],
  }),
  component: DomainResolver,
});

function DomainResolver() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useEffect(() => {
    const resolve = async () => {
      const hostname = window.location.hostname.toLowerCase().replace(/^www\./, "");
      if (isMockMode || hostname === "localhost" || hostname === "127.0.0.1") {
        navigate({ to: "/s/$store_slug", params: { store_slug: "demo" }, replace: true });
        return;
      }
      const { data, error: domainError } = await supabase
        .from("custom_domains")
        .select("stores!inner(slug)")
        .eq("hostname", hostname)
        .in("status", ["verified", "active"])
        .maybeSingle();
      if (domainError || !data?.stores?.slug) {
        setError("هذا النطاق غير مربوط بمتجر نشط.");
        return;
      }
      navigate({
        to: "/s/$store_slug",
        params: { store_slug: data.stores.slug },
        replace: true,
      });
    };
    resolve();
  }, [navigate]);
  return (
    <div dir="rtl" className="grid min-h-screen place-items-center bg-gray-50 p-4 text-center">
      <div>
        <h1 className="text-xl font-bold">{error || "جارٍ فتح قائمة المطعم…"}</h1>
        {error && <p className="mt-2 text-sm text-gray-500">تحقق من إعدادات DNS في لوحة المطعم.</p>}
      </div>
    </div>
  );
}
