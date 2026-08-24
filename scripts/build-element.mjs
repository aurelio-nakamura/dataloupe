// Bundles the `<dataloupe-table>` web component (src/element.ts) into a single
// self-contained ESM file for direct <script type="module"> use on any page.
// Everything runs client-side; the only external ref a host page needs is this
// same script. Ships to both dist/ (npm) and docs/embed/ (Pages demo).
import { build } from "esbuild";
import { readFile, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));

const outfile = resolve(root, "dist/dataloupe-element.js");
await build({
  entryPoints: [resolve(root, "src/element.ts")],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outfile,
  external: ["node:fs/promises"],
  define: { __DATALOUPE_VERSION__: JSON.stringify(pkg.version) },
  legalComments: "none",
  logLevel: "info",
});

// Mirror into the Pages demo dir so the embed demo is self-hosted (0 external refs).
await copyFile(outfile, resolve(root, "docs/embed/dataloupe-element.js"));
