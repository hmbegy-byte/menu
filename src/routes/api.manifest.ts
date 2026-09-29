import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { safeInstalledStartPath } from "../lib/hostedAppDestination.mjs";
import {
  fallbackPlatformBrand,
  readPublicBrand,
  resolveCurrentStoreSlug,
} from "../lib/platformBrand";

export const Route = createFileRoute("/api/manifest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const requestedStore = url.searchParams.get("store");
        const referringPath = request.headers.get("referer")
          ? new URL(request.headers.get("referer") as string).pathname
          : "";
        const referredStore = referringPath.match(/^\/(?:s|kitchen|admin)\/([^/]+)/)?.[1] || null;
        const requestedSlug = requestedStore || referredStore;
        const resolved = requestedSlug
          ? await resolveCurrentStoreSlug(requestedSlug)
          : { currentSlug: "", isAlias: false };
        const storeSlug = resolved.currentSlug || requestedSlug;
        const startUrl =
          (requestedStore ? `/s/${storeSlug}` : safeInstalledStartPath(referringPath)) ||
          (storeSlug ? `/s/${storeSlug}` : "/");

        const brandAssets = {
          ...fallbackPlatformBrand,
          ...(await readPublicBrand(storeSlug || undefined)),
        };

        const manifest = {
          name: brandAssets.brand_name,
          short_name: brandAssets.pwa_short_name || brandAssets.brand_name,
          description: brandAssets.meta_description,
          id: startUrl,
          start_url: startUrl,
          scope: "/",
          display: "standalone",
          background_color: brandAssets?.theme_color || "#ffffff",
          theme_color: brandAssets?.theme_color || "#0284c7",
          icons: [
            {
              src: brandAssets?.favicon_url || "/favicon.svg",
              sizes: "192x192 512x512",
              type: brandAssets?.favicon_url ? "image/png" : "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        };

        return new Response(JSON.stringify(manifest), {
          headers: {
            "Content-Type": "application/manifest+json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
