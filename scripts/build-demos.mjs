// Regenerates the "try it live" demo pages under docs/demo/ from bundled
// example datasets, so GitHub Pages can serve a one-click showcase.
// Usage: npm run build && node scripts/build-demos.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");
const demoDir = join(root, "docs", "demo");
mkdirSync(demoDir, { recursive: true });

const jobs = [
  { in: "examples/penguins.csv", out: "docs/demo/penguins.html" },
];

for (const j of jobs) {
  execFileSync("node", [cli, join(root, j.in), "-o", join(root, j.out)], {
    stdio: "inherit",
  });
}

// diff showcase: a real `dataloupe diff` report between two product snapshots.
execFileSync(
  "node",
  [
    cli,
    "diff",
    join(root, "examples/products-before.csv"),
    join(root, "examples/products-after.csv"),
    "--key",
    "id",
    "-o",
    join(root, "docs/demo/diff.html"),
  ],
  { stdio: "inherit" },
);

console.log("demos written to docs/demo/");
