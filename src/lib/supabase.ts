import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] || "placeholder-key";

export const isMockMode =
  !import.meta.env["VITE_SUPABASE_URL"] ||
  import.meta.env["VITE_SUPABASE_URL"].includes("placeholder");
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
// Dedicated kitchen session: admin logout/lock must not stop incoming orders.
export const kitchenSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storageKey: "flavor-flow-kitchen-auth", detectSessionInUrl: false },
});
