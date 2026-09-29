import { supabase } from "./supabase";

export type PublicBrand = {
  brand_name?: string;
  legal_name?: string;
  logo_url?: string;
  favicon_url?: string;
  theme_color?: string;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  pwa_short_name?: string;
  support_email?: string;
  support_phone?: string;
};

export const fallbackPlatformBrand: Required<
  Pick<PublicBrand, "brand_name" | "meta_title" | "meta_description" | "pwa_short_name">
> = {
  brand_name: "HMB Serve",
  meta_title: "HMB Serve — تشغيل مطعمك من مكان واحد",
  meta_description: "منصة عربية لإدارة الطلبات والمطبخ والمنيو والولاء للمطاعم.",
  pwa_short_name: "HMB Serve",
};

export async function readPublicBrand(storeSlug?: string): Promise<PublicBrand> {
  const { data, error } = await supabase.rpc("public_brand", { p_store_slug: storeSlug || null });
  if (error) return {};
  const row = (Array.isArray(data) ? data[0] : data) || {};
  // PostgreSQL returns nullable columns for unconfigured fields. Do not let those
  // erase the current safe defaults or a restaurant's own fallback identity.
  return Object.fromEntries(
    Object.entries(row).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    ),
  ) as PublicBrand;
}

export async function resolveCurrentStoreSlug(slug: string) {
  const normalized = slug.trim().toLowerCase();
  const { data, error } = await supabase.rpc("resolve_store_slug", { p_slug: normalized });
  if (error) return { currentSlug: normalized, isAlias: false };
  const row = Array.isArray(data) ? data[0] : data;
  return { currentSlug: row?.current_slug || normalized, isAlias: Boolean(row?.is_alias) };
}
