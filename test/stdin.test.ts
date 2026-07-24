import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDatasetFromText, renderText } from "../src/index.js";

const CLI = join(__dirname, "..", "dist", "cli.js");

function runStdin(input: string, args: string[]): { out: string; html: string } {
  const dir = mkdtempSync(join(tmpdir(), "dataloupe-stdin-"));
  const outPath = join(dir, "out.html");
  const out = execFileSync("node", [CLI, ...args, "-o", outPath], {
    input,
    encoding: "utf8",
  });
  const html = readFileSync(outPath, "utf8");
  rmSync(dir, { recursive: true, force: true });
  return { out, html };
}

describe("stdin / pipe support", () => {
  it("reads CSV from stdin via '-'", () => {
    const { out, html } = runStdin("a,b\n1,x\n2,y\n", ["-"]);
    expect(out).toContain("2 rows × 2 cols · csv");
    expect(html).toContain("<!doctype html>");
  });

  it("auto-sniffs a JSON array piped with no file arg", () => {
    const { out } = runStdin('[{"a":1,"b":"x"},{"a":2,"b":"y"}]', []);
    expect(out).toContain("json");
    expect(out).toContain("2 rows × 2 cols");
  });

  it("auto-sniffs NDJSON (multiple {-lines) from stdin", () => {
    const { out } = runStdin('{"a":1}\n{"a":2}\n{"a":3}\n', []);
    expect(out).toContain("ndjson");
    expect(out).toContain("3 rows");
  });

  it("stdin output is fully offline (no external resource loads)", () => {
    const { html } = runStdin("a,b\n1,x\n2,y\n", ["-"]);
    expect(html).not.toMatch(/<(script|link|img)[^>]*(src|href)="https?:\/\//);
  });

  it("buildDatasetFromText / renderText work in-process", () => {
    const ds = buildDatasetFromText("x,y\n1,2\n3,4\n", "csv");
    expect(ds.rowCount).toBe(2);
    expect(ds.columns).toEqual(["x", "y"]);
    expect(ds.source).toBe("stdin");
    const html = renderText("x,y\n1,2\n", "csv");
    expect(html).toContain("<!doctype html>");
  });

  it("rejects binary formats on stdin with a clear message", () => {
    expect(() => buildDatasetFromText("garbage", "parquet")).toThrow(/cannot be read from stdin/);
  });

  it("--help wins even when stdout is piped (non-TTY)", () => {
    // execFileSync pipes stdout, so process.stdin is non-TTY here; --help must
    // still print help rather than block reading stdin.
    const out = execFileSync("node", [CLI, "--help"], { input: "", encoding: "utf8" });
    expect(out).toContain("USAGE");
    expect(out).toContain("stdin");
  });
});
