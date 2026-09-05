import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(projectRoot, ".output");
const destination = resolve(projectRoot, "dist");

if (!existsSync(resolve(source, "server", "index.mjs"))) {
  throw new Error("لم يتم العثور على ناتج البناء المتوقع");
}

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
// The root index is a Vite renderer template, not a deployable static page.
// Leaving it in public lets an assets-first host bypass the SSR worker.
rmSync(resolve(destination, "public", "index.html"), { force: true });
mkdirSync(resolve(destination, "server"), { recursive: true });
cpSync(resolve(source, "server", "index.mjs"), resolve(destination, "server", "index.js"));
