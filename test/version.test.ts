import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgVersion = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version as string;
const cli = join(root, "dist", "cli.js");

// Guards against the VERSION constant drifting from package.json (it once did:
// package was 0.2.0 but the built CLI still reported 0.1.0). The version is now
// injected at build time via esbuild --define, so a fresh build must match.
describe("built CLI version", () => {
  it("--version matches package.json (requires a build)", () => {
    if (!existsSync(cli)) {
      // No build present (e.g. CI running tests before build) — skip rather than fail.
      return;
    }
    const out = execFileSync("node", [cli, "--version"], { encoding: "utf8" }).trim();
    expect(out).toBe(pkgVersion);
  });
});
