// Bundles the browser entry (src/browser.ts) into a single ESM file that
// powers the in-browser playground at docs/playground/. Everything runs
// client-side; the page fetches only this same-origin script.
import { build } from "esbuild";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

await build({
  entryPoints: [resolve(root, "src/browser.ts")],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outfile: resolve(root, "docs/playground/dataloupe.browser.js"),
  // parseXlsx()'s lazy Node import is never reached in the browser (the page
  // calls parseXlsxBytes). Keep it external so it doesn't break the bundle.
  external: ["node:fs/promises"],
  define: { __DATALOUPE_VERSION__: JSON.stringify(pkg.version) },
  legalComments: "none",
  logLevel: "info",
});
