import { spawnSync } from "node:child_process";
import { loadEnv } from "vite";

const config = { ...loadEnv("production", process.cwd(), "VITE_"), ...process.env };
if (
  config.VITE_DEMO_MODE !== "true" &&
  (!config.VITE_SUPABASE_URL ||
    !config.VITE_SUPABASE_ANON_KEY ||
    config.VITE_SUPABASE_URL.includes("placeholder"))
) {
  throw new Error(
    "Render build requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY; demo must be explicitly enabled.",
  );
}
const result = spawnSync(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "build", "--mode", "production"],
  {
    stdio: "inherit",
    env: { ...process.env, NITRO_PRESET: "node-server" },
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import("./prepare-render-output.mjs");
