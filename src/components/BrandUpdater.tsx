import { useEffect } from "react";
import { fallbackPlatformBrand } from "../lib/platformBrand";

export interface BrandAssets {
  brand_name?: string;
  meta_title?: string;
  meta_description?: string;
  favicon_url?: string;
  theme_color?: string;
  og_image_url?: string;
  pwa_short_name?: string;
}

export function BrandUpdater({
  assets,
  isStore = false,
}: {
  assets?: BrandAssets;
  isStore?: boolean;
}) {
  useEffect(() => {
    if (!assets) return;

    const selectors = [
      'meta[name="description"]',
      'meta[property="og:site_name"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image"]',
      'meta[name="theme-color"]',
      'link[rel="icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="manifest"]',
    ];
    const previousTitle = document.title;
    const previous = new Map(
      selectors.map((selector) => {
        const element = document.querySelector(selector);
        return [selector, element ? element.cloneNode(true) : null] as const;
      }),
    );

    if (assets.meta_title || assets.brand_name) {
      document.title = assets.meta_title || assets.brand_name || fallbackPlatformBrand.brand_name;
    }

    const updateTag = (selector: string, attr: string, value?: string, createTag?: string) => {
      let el = document.querySelector(selector);
      if (value) {
        if (!el && createTag) {
          el = document.createElement(createTag);
          if (createTag === "meta") {
            const isProperty = selector.includes("property=");
            const attrName = isProperty ? "property" : "name";
            const attrValue = selector.match(/["'](.*?)["']/)?.[1] || "";
            el.setAttribute(attrName, attrValue);
          }
          document.head.appendChild(el);
        }
        if (el) el.setAttribute(attr, value);
      }
    };

    updateTag('meta[name="description"]', "content", assets.meta_description, "meta");
    updateTag('meta[property="og:site_name"]', "content", assets.brand_name, "meta");
    updateTag(
      'meta[property="og:title"]',
      "content",
      assets.meta_title || assets.brand_name,
      "meta",
    );
    updateTag('meta[property="og:description"]', "content", assets.meta_description, "meta");
    updateTag('meta[property="og:image"]', "content", assets.og_image_url, "meta");
    updateTag('meta[name="theme-color"]', "content", assets.theme_color, "meta");

    // Update favicon
    if (assets.favicon_url) {
      // Append cache buster to icon URL
      const iconUrl = `${assets.favicon_url}?t=${Date.now()}`;
      updateTag('link[rel="icon"]', "href", iconUrl, "link");
      updateTag('link[rel="apple-touch-icon"]', "href", iconUrl, "link");
    } else if (isStore) {
      // Fallback to platform favicon
      updateTag('link[rel="icon"]', "href", "/favicon.svg", "link");
      updateTag('link[rel="apple-touch-icon"]', "href", "/favicon.svg", "link");
    }

    // Dynamic Manifest
    const storeSlug = window.location.pathname.match(/^\/s\/([^/]+)/)?.[1];
    const manifestUrl = storeSlug ? `/api/manifest?store=${storeSlug}` : "/api/manifest";
    updateTag('link[rel="manifest"]', "href", manifestUrl, "link");

    return () => {
      if (!isStore) return;
      document.title = previousTitle;
      previous.forEach((snapshot, selector) => {
        const current = document.querySelector(selector);
        if (!snapshot) current?.remove();
        else if (current) current.replaceWith(snapshot.cloneNode(true));
        else document.head.appendChild(snapshot.cloneNode(true));
      });
    };
  }, [assets, isStore]);

  return null;
}
