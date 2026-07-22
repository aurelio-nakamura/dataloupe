import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDataset } from "../src/dataset.js";
import { renderHtml } from "../src/render.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "alltypes_plain.parquet");

describe("parquet", () => {
  it("reads a parquet file into a typed dataset", async () => {
    const ds = await buildDataset(fixture);
    expect(ds.format).toBe("parquet");
    expect(ds.rowCount).toBeGreaterThan(0);
    expect(ds.columns.length).toBeGreaterThan(0);
    // every column has a stats entry
    expect(ds.stats.length).toBe(ds.columns.length);
  });

  it("renders parquet to a self-contained offline HTML file", async () => {
    const ds = await buildDataset(fixture);
    const html = renderHtml(ds);
    expect(html).toContain("__DATALOUPE__");
    // no external resource loads
    expect(/<script[^>]+src=/i.test(html)).toBe(false);
    expect(/<link[^>]+href=/i.test(html)).toBe(false);
    expect(/https?:\/\/(?!github\.com\/aurelio-nakamura)/i.test(html)).toBe(false);
  });
});
