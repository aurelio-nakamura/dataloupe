import { describe, expect, it } from "vitest";
import { datasetFromRows, diffDatasets, renderDiffHtml } from "../src/index.js";

const before = () =>
  datasetFromRows(
    [
      { id: 1, name: "Ada", salary: 120000 },
      { id: 2, name: "Alan", salary: 110000 },
      { id: 3, name: "Grace", salary: 130000 },
    ],
    { source: "old.csv" },
  );

const after = () =>
  datasetFromRows(
    [
      { id: 1, name: "Ada", salary: 125000 }, // changed salary
      { id: 2, name: "Alan", salary: 110000 }, // unchanged
      { id: 4, name: "Edsger", salary: 115000 }, // added
    ],
    { source: "new.csv" },
  );

describe("diffDatasets", () => {
  it("classifies added/removed/changed/unchanged with an explicit key", () => {
    const d = diffDatasets(before(), after(), { key: "id" });
    expect(d.counts).toEqual({ added: 1, removed: 1, changed: 1, unchanged: 1 });
    expect(d.keyColumns).toEqual(["id"]);
    expect(d.added[0]).toContain("Edsger");
    expect(d.removed[0]).toContain("Grace");
    expect(d.changed[0].changed).toEqual(["salary"]);
  });

  it("auto-detects a unique id-like key when none is given", () => {
    const d = diffDatasets(before(), after());
    expect(d.keyAuto).toBe(true);
    expect(d.keyColumns).toEqual(["id"]);
    expect(d.counts.changed).toBe(1);
  });

  it("falls back to whole-row matching when no unique key exists", () => {
    const b = datasetFromRows(
      [
        { city: "NYC", pop: 8 },
        { city: "NYC", pop: 8 },
      ],
      { source: "a" },
    );
    const a = datasetFromRows(
      [
        { city: "NYC", pop: 8 },
        { city: "LA", pop: 4 },
      ],
      { source: "b" },
    );
    const d = diffDatasets(b, a);
    expect(d.keyColumns).toEqual([]);
    expect(d.counts).toEqual({ added: 1, removed: 1, changed: 0, unchanged: 1 });
  });

  it("unions columns across schemas and reports added columns as changes", () => {
    const b = datasetFromRows([{ id: 1, a: "x" }], { source: "a" });
    const a = datasetFromRows([{ id: 1, a: "x", b: "y" }], { source: "b" });
    const d = diffDatasets(b, a, { key: "id" });
    expect(d.columns).toEqual(["id", "a", "b"]);
    expect(d.counts.changed).toBe(1);
    expect(d.changed[0].changed).toEqual(["b"]);
  });

  it("renderDiffHtml produces self-contained HTML with no external resources", () => {
    const html = renderDiffHtml(diffDatasets(before(), after(), { key: "id" }));
    expect(html).toContain("<!doctype html>");
    // The only allowed external URL is the by-design GitHub footer link.
    const urls = (html.match(/https?:\/\/[^"'\s)]+/g) || []).filter(
      (u) => !u.startsWith("https://github.com/aurelio-nakamura/dataloupe"),
    );
    expect(urls).toEqual([]);
    expect(html).toContain("AI agent");
  });
});
