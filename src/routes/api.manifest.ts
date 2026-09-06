import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/api/manifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const storeSlug = url.searchParams.get("store");

        let brandAssets: any = null;

        if (storeSlug) {
          const { data: store } = await supabase
            .from("stores")
            .select("id")
            .eq("slug", storeSlug)
            .maybeSingle();

          if (store) {
            const { data: assets } = await supabase
              .from("brand_assets")
              .select("*")
              .eq("store_id", store.id)
              .maybeSingle();
            
            if (assets) {
              brandAssets = assets;
            }
          }
        }

        const manifest = {
          name: brandAssets?.brand_name || "Flavor Flow",
          short_name: brandAssets?.pwa_short_name || brandAssets?.brand_name || "Flavor Flow",
          description: brandAssets?.meta_description || "Restaurant menu and ordering",
          start_url: storeSlug ? `/s/${storeSlug}` : "/",
          display: "standalone",
          background_color: brandAssets?.theme_color || "#ffffff",
          theme_color: brandAssets?.theme_color || "#0284c7",
          icons: [
            {
              src: brandAssets?.favicon_url || "/favicon.svg",
              sizes: "192x192 512x512",
              type: brandAssets?.favicon_url ? "image/png" : "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
