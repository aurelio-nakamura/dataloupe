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

  it("ships the durable/shareable view-state code (URL-hash sync)", async () => {
    const p = await tmp("d.csv", "id,city\n1,NYC\n2,LA\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    // The viewer mirrors query/sort/focus/theme into location.hash so a filtered,
    // sorted view can be bookmarked or shared. Guard the shipped markers.
    expect(html).toContain("hashchange");
    expect(html).toContain("sortcol");
    expect(html).toContain("replaceState");
  });

  it("embeds a human --title and --note when provided, and sets the tab title", async () => {
    const p = await tmp("t.csv", "id,city\n1,NYC\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds, { title: "Q1 Expenses", note: "dropped nulls; USD" });
    expect(html).toContain('"title":"Q1 Expenses"');
    expect(html).toContain('"note":"dropped nulls; USD"');
    expect(html).toContain("<title>dataloupe · Q1 Expenses</title>");
  });

  it("omits title/note keys from the payload when not provided", async () => {
    const p = await tmp("n.csv", "id,city\n1,NYC\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    expect(html).not.toContain('"title":');
    expect(html).not.toContain('"note":');
  });

  it("bundles the collapsible provenance panel into the viewer", async () => {
    const p = await tmp("p.csv", "id,city\n1,NYC\n");
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    // The 'about this file' panel and its copy-link action ship inside the file.
    expect(html).toContain("About this file");
    expect(html).toContain("prov-panel");
    expect(html).toContain("Copy link to this view");
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

  // Hostile-input regression guard (from a security review of the shareable viewer):
  // a crafted cell value must never break out of the JSON data island, and every
  // generated artifact must carry the network-egress-blocking CSP so the policy stays
  // the backstop even if a DOM sink is ever introduced.
  it("neutralizes an html/script payload in a cell and keeps it inside the data island", async () => {
    const payload = '<img src=x onerror=window.__x=1></script><script>window.__y=1</script>';
    const p = await tmp("xss.csv", `id,note\n1,"${payload.replace(/"/g, '""')}"\n`);
    const ds = await buildDataset(p);
    const html = renderHtml(ds);
    const marker = 'type="application/json">';
    const islandStart = html.indexOf(marker) + marker.length;
    const islandEnd = html.indexOf("</script>", islandStart);
    const island = html.slice(islandStart, islandEnd);
    const outsideIsland = html.slice(0, islandStart) + html.slice(islandEnd);
    expect(island).not.toContain("</script>");
    expect(outsideIsland).not.toContain("onerror=window.__x");
    expect(outsideIsland).not.toContain("<script>window.__y");
  });

  it("embeds the network-blocking CSP in every generated file", async () => {
    const p = await tmp("csp.csv", "id,city\n1,NYC\n");
    const html = renderHtml(await buildDataset(p));
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("connect-src 'none'");
  });
});
