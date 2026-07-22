import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDataset } from "../src/dataset.js";
import { renderHtml } from "../src/render.js";
import { parseXlsx } from "../src/xlsx.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "sample.xlsx");

describe("xlsx", () => {
  it("reads the first worksheet with headers, strings, booleans and numbers", async () => {
    const ds = await buildDataset(fixture);
    expect(ds.format).toBe("xlsx");
    expect(ds.columns).toEqual(["name", "city", "active", "signup", "score"]);
    expect(ds.rowCount).toBe(3);
    expect(ds.rows[0].name).toBe("Alice");
    expect(ds.rows[0].city).toBe("London");
    expect(ds.rows[0].active).toBe(true);
    expect(ds.rows[1].active).toBe(false);
    expect(ds.rows[0].score).toBe(91.5);
  });

  it("recognises date-formatted serials as dates", async () => {
    const ds = await buildDataset(fixture);
    expect(ds.types.signup).toBe("date");
    // 2024-01-15 -> Excel serial 45306
    const iso = new Date(ds.stats.find((s) => s.name === "signup")!.min!).toISOString();
    expect(iso.slice(0, 10)).toBe("2024-01-15");
  });

  it("infers numeric and boolean column types", async () => {
    const ds = await buildDataset(fixture);
    expect(ds.types.score).toBe("number");
    expect(ds.types.active).toBe("boolean");
    expect(ds.types.name).toBe("string");
  });

  it("can select a worksheet by name and exposes sheet names", async () => {
    const res = await parseXlsx(fixture, { sheet: "Notes" });
    expect(res.sheetNames).toEqual(["People", "Notes"]);
    expect(res.sheet).toBe("Notes");
    expect(res.rows[0].note).toBe("second sheet");
  });

  it("throws a helpful error for an unknown sheet", async () => {
    await expect(parseXlsx(fixture, { sheet: "Nope" })).rejects.toThrow(/not found/i);
  });

  it("renders xlsx to a self-contained offline HTML file", async () => {
    const ds = await buildDataset(fixture);
    const html = renderHtml(ds);
    expect(html).toContain("__DATALOUPE__");
    expect(/<script[^>]+src=/i.test(html)).toBe(false);
    expect(/<link[^>]+href=/i.test(html)).toBe(false);
    expect(/https?:\/\/(?!github\.com\/aurelio-nakamura)/i.test(html)).toBe(false);
  });
});
