import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CLI = join(__dirname, "..", "dist", "cli.js");

describe("dataloupe diff --json (CI / GitHub Action contract)", () => {
  it("prints a machine-readable summary and correct counts", () => {
    const dir = mkdtempSync(join(tmpdir(), "dataloupe-diffcli-"));
    const before = join(dir, "before.csv");
    const after = join(dir, "after.csv");
    const out = join(dir, "d.html");
    writeFileSync(before, "id,name,salary\n1,Ada,120000\n2,Alan,110000\n3,Grace,130000\n");
    writeFileSync(after, "id,name,salary\n1,Ada,125000\n2,Alan,110000\n4,Edsger,115000\n");

    const stdout = execFileSync(
      "node",
      [CLI, "diff", before, after, "--key", "id", "--json", "-o", out],
      { encoding: "utf8" },
    );

    const summary = JSON.parse(stdout);
    expect(summary.counts).toEqual({ added: 1, removed: 1, changed: 1, unchanged: 1 });
    expect(summary.keyColumns).toEqual(["id"]);
    expect(summary.changed).toBe(true);
    expect(summary.output).toBe(out);
    expect(typeof summary.bytes).toBe("number");

    rmSync(dir, { recursive: true, force: true });
  });

  it("reports changed=false when nothing differs", () => {
    const dir = mkdtempSync(join(tmpdir(), "dataloupe-diffcli-"));
    const a = join(dir, "a.csv");
    const b = join(dir, "b.csv");
    const out = join(dir, "d.html");
    writeFileSync(a, "id,x\n1,foo\n2,bar\n");
    writeFileSync(b, "id,x\n1,foo\n2,bar\n");

    const stdout = execFileSync(
      "node",
      [CLI, "diff", a, b, "--key", "id", "--json", "-o", out],
      { encoding: "utf8" },
    );
    const summary = JSON.parse(stdout);
    expect(summary.counts).toEqual({ added: 0, removed: 0, changed: 0, unchanged: 2 });
    expect(summary.changed).toBe(false);

    rmSync(dir, { recursive: true, force: true });
  });
});
