import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { buildDataset } from "../src/dataset.js";
import { renderHtml } from "../src/render.js";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "dataloupe-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function tmp(name: string, content: string): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, content, "utf8");
  return p;
}

describe("buildDataset", () => {
  it("parses CSV with types and stats", async () => {
    const p = await tmp("a.csv", "id,name,score\n1,Alice,88.5\n2,Bob,\n3,Carol,95\n");
    const ds = await buildDataset(p);
    expect(ds.columns).toEqual(["id", "name", "score"]);
    expect(ds.types.id).toBe("integer");
    expect(ds.types.name).toBe("string");
    expect(ds.types.score).toBe("number");
    expect(ds.rowCount).toBe(3);
    const score = ds.stats.find((s) => s.name === "score")!;
    expect(score.nulls).toBe(1);
  });

  it("honors the row limit and reports truncation", async () => {
    const rows = Array.from({ length: 100 }, (_, i) => `${i},v${i}`).join("\n");
    const p = await tmp("b.csv", "id,v\n" + rows + "\n");
    const ds = await buildDataset(p, { limit: 10 });
    expect(ds.rowCount).toBe(10);
    expect(ds.truncated).toBe(true);
    expect(ds.totalRowCount).toBe(100);
  });

  it("parses NDJSON", async () => {
    const p = await tmp(
      "c.ndjson",
      '{"a":1,"b":true}\n{"a":2,"b":false}\n{"a":3,"b":true}\n',
    );
    const ds = await buildDataset(p);
    expect(ds.rowCount).toBe(3);
    expect(ds.types.a).toBe("integer");
    expect(ds.types.b).toBe("boolean");
  });
});

describe("renderHtml", () => {
  it("produces a self-contained HTML file with no external requests", async () => {
    const p = await tmp("d.csv", "id,city\n1,NYC\n2,LA\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    // No external resource references.
    expect(/<script[^>]+src=/i.test(html)).toBe(false);
    expect(/<link[^>]+href=/i.test(html)).toBe(false);
    expect(/https?:\/\/(?!github\.com\/aurelio-nakamura)/i.test(html)).toBe(false);
    // Data is embedded.
    expect(html).toContain("__DATALOUPE__");
    expect(html).toContain("NYC");
  });

  it("escapes a script-closing sequence inside data", async () => {
    const p = await tmp("e.csv", "id,html\n1,</script><b>x</b>\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    // The raw closing tag must not appear unescaped in the JSON payload.
    const payloadStart = html.indexOf('type="application/json">') + 'type="application/json">'.length;
    const payloadEnd = html.indexOf("</script>", payloadStart);
    const payload = html.slice(payloadStart, payloadEnd);
    expect(payload).not.toContain("</script>");
    expect(payload).toContain("<\\/script>");
  });
});
