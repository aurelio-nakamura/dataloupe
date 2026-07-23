import { describe, expect, it } from "vitest";
import { datasetFromRows, renderRows, renderHtml, VERSION } from "../src/index.js";

describe("programmatic API", () => {
  it("datasetFromRows infers types, stats and column order from memory", () => {
    const ds = datasetFromRows(
      [
        { name: "Ada", born: 1815, active: true },
        { name: "Alan", born: 1912, active: false },
        { name: "Grace", born: 1906, active: true },
      ],
      { source: "pioneers" },
    );
    expect(ds.columns).toEqual(["name", "born", "active"]);
    expect(ds.types.name).toBe("string");
    expect(ds.types.born).toBe("integer");
    expect(ds.types.active).toBe("boolean");
    expect(ds.rowCount).toBe(3);
    expect(ds.source).toBe("pioneers");
    expect(ds.truncated).toBe(false);
  });

  it("datasetFromRows defaults source/format to \"memory\"", () => {
    const ds = datasetFromRows([{ a: 1 }, { a: 2 }]);
    expect(ds.source).toBe("memory");
    expect(ds.format).toBe("memory");
  });

  it("renderRows returns a self-contained HTML string with no external resources", () => {
    const html = renderRows([{ city: "NYC", pop: 8419000 }, { city: "LA", pop: 3980000 }]);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(/<script[^>]+src=/i.test(html)).toBe(false);
    expect(/<link[^>]+href=/i.test(html)).toBe(false);
    expect(/https?:\/\/(?!github\.com\/aurelio-nakamura)/i.test(html)).toBe(false);
    expect(html).toContain("NYC");
  });

  it("renderHtml + datasetFromRows compose", () => {
    const html = renderHtml(datasetFromRows([{ x: 1 }]));
    expect(html).toContain("__DATALOUPE__");
  });

  it("exposes a version string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
  });
});
