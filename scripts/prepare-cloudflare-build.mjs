import { readFile, writeFile } from "node:fs/promises";

const configPath = new URL("../.output/server/wrangler.json", import.meta.url);
const config = JSON.parse(await readFile(configPath, "utf8"));

config.name = "hmb-serve";
// Keep this pinned so a Riyadh-local build cannot generate tomorrow's UTC date.
config.compatibility_date = "2026-09-29";

await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
