import { useEffect } from 'react';

export interface BrandAssets {
  brand_name?: string;
  meta_title?: string;
  meta_description?: string;
  favicon_url?: string;
  theme_color?: string;
  og_image_url?: string;
  pwa_short_name?: string;
}

export function BrandUpdater({ assets, isStore = false }: { assets?: BrandAssets, isStore?: boolean }) {
  useEffect(() => {
    if (!assets) return;
    
    if (assets.meta_title || assets.brand_name) {
      document.title = assets.meta_title || assets.brand_name || 'Flavor Flow';
    }

    const updateTag = (selector: string, attr: string, value?: string, createTag?: string) => {
      let el = document.querySelector(selector);
      if (value) {
        if (!el && createTag) {
          el = document.createElement(createTag);
          if (createTag === 'meta') {
            const isProperty = selector.includes('property=');
            const attrName = isProperty ? 'property' : 'name';
            const attrValue = selector.match(/["'](.*?)["']/)?.[1] || '';
            el.setAttribute(attrName, attrValue);
          }
          document.head.appendChild(el);
        }
        if (el) el.setAttribute(attr, value);
      }
    };

    updateTag('meta[name="description"]', 'content', assets.meta_description, 'meta');
    updateTag('meta[property="og:site_name"]', 'content', assets.brand_name, 'meta');
    updateTag('meta[property="og:title"]', 'content', assets.meta_title || assets.brand_name, 'meta');
    updateTag('meta[property="og:description"]', 'content', assets.meta_description, 'meta');
    updateTag('meta[property="og:image"]', 'content', assets.og_image_url, 'meta');
    updateTag('meta[name="theme-color"]', 'content', assets.theme_color, 'meta');

    // Update favicon
    if (assets.favicon_url) {
      // Append cache buster to icon URL
      const iconUrl = `${assets.favicon_url}?t=${Date.now()}`;
      updateTag('link[rel="icon"]', 'href', iconUrl, 'link');
      updateTag('link[rel="apple-touch-icon"]', 'href', iconUrl, 'link');
    } else if (isStore) {
      // Fallback to platform favicon
      updateTag('link[rel="icon"]', 'href', '/favicon.svg', 'link');
      updateTag('link[rel="apple-touch-icon"]', 'href', '/favicon.svg', 'link');
    }

    // Dynamic Manifest
    const storeSlug = window.location.pathname.match(/^\/s\/([^\/]+)/)?.[1];
    const manifestUrl = storeSlug ? `/api/manifest?store=${storeSlug}` : '/api/manifest';
    updateTag('link[rel="manifest"]', 'href', manifestUrl, 'link');

  }, [assets, isStore]);

  return null;
}
