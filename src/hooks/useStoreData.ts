/* eslint-disable @typescript-eslint/no-explicit-any -- Public store payloads mirror configurable JSON fields. */
import { useEffect, useState } from "react";
import { isMockMode, supabase } from "../lib/supabase";
import { readDemoData } from "../lib/storeDefaults";

const initial: any = {
  store: null,
  categories: [],
  products: [],
  offers: [],
  banners: [],
  addons: [],
  appearance: {},
  settings: {},
  payment: {},
};

export function useStoreData(storeSlug: string) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: any;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isMockMode) {
          if (storeSlug !== "demo") throw new Error("المطعم غير موجود");
          if (!cancelled) setData(readDemoData());
          return;
        }
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("slug", storeSlug)
          .eq("is_active", true)
          .maybeSingle();
        if (storeError) throw storeError;
        if (!store) throw new Error("المطعم غير موجود أو غير متاح حاليًا");
        const results = await Promise.all([
          supabase
            .from("categories")
            .select("*")
            .eq("store_id", store.id)
            .eq("is_active", true)
            .order("display_order"),
          supabase
            .from("products")
            .select("*")
            .eq("store_id", store.id)
            .eq("is_available", true)
            .order("created_at"),
          supabase
            .from("offers")
            .select("*")
            .eq("store_id", store.id)
            .eq("active", true)
            .order("created_at"),
          supabase
            .from("banners")
            .select("*")
            .eq("store_id", store.id)
            .eq("active", true)
            .order("display_order"),
          supabase
            .from("addons")
            .select("*")
            .eq("store_id", store.id)
            .eq("is_active", true)
            .order("created_at"),
        ]);
        const failed = results.find((r) => r.error);
        if (failed?.error) throw failed.error;
        if (!cancelled)
          setData({
            store,
            categories: results[0].data || [],
            products: results[1].data || [],
            offers: results[2].data || [],
            banners: results[3].data || [],
            addons: results[4].data || [],
            appearance: store.appearance || {},
            settings: store.settings || {},
            payment: store.payment || {},
          });
        if (!channel)
          channel = supabase
            .channel(`public-store-${store.id}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "stores", filter: `id=eq.${store.id}` },
              load,
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "products",
                filter: `store_id=eq.${store.id}`,
              },
              load,
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "categories",
                filter: `store_id=eq.${store.id}`,
              },
              load,
            )
            .subscribe();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "تعذر تحميل المطعم");
          setData(initial);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const onStorage = () => {
      if (isMockMode) load();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      if (channel) supabase.removeChannel(channel);
    };
  }, [storeSlug]);
  return { ...data, loading, error };
}
