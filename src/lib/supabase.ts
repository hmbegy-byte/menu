import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "placeholder-key";

// Keep the general/platform/admin session inside the current browser tab. Supabase's
// default localStorage adapter broadcasts a newly signed-in restaurant account to
// every open tab, which used to sign the other restaurant out. sessionStorage keeps
// two restaurant administration tabs independent while still surviving refreshes.
const tabAuthStorage =
  typeof window === "undefined"
    ? undefined
    : {
        getItem: (key: string) => window.sessionStorage.getItem(key),
        setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
        removeItem: (key: string) => window.sessionStorage.removeItem(key),
      };

export const isMockMode = import.meta.env["VITE_DEMO_MODE"] === "true";
if (!isMockMode && (supabaseUrl.includes("placeholder") || supabaseAnonKey === "placeholder-key")) {
  throw new Error(
    "Flavor Flow configuration missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Demo requires explicit VITE_DEMO_MODE=true.",
  );
}
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  tabAuthStorage
    ? {
        auth: {
          storage: tabAuthStorage,
          storageKey: "flavor-flow-tab-auth",
          persistSession: true,
        },
      }
    : undefined,
);
// Dedicated kitchen session: admin logout/lock must not stop incoming orders.
export const kitchenSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: "flavor-flow-kitchen-auth", detectSessionInUrl: false },
});
