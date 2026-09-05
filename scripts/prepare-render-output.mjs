import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const serverEntry = resolve(projectRoot, ".output", "server", "index.mjs");
const rendererTemplate = resolve(projectRoot, ".output", "public", "index.html");

if (!existsSync(serverEntry)) {
  throw new Error("لم يتم العثور على خادم Render الناتج عن البناء");
}

// Vite emits its renderer template into the public directory. On a production
// host it would be served before SSR and leave the browser pointing at source files.
rmSync(rendererTemplate, { force: true });
