import { describe, it, expect } from "vitest";
import {
  runQuery,
  matches,
  aggregate,
  toMarkdown,
  fmtDisplay,
} from "../src/mcp-query.js";

const rows = [
  { id: 1, name: "Alice", dept: "Eng", salary: 120 },
  { id: 2, name: "Bob", dept: "Eng", salary: 110 },
  { id: 3, name: "Carol", dept: "Sales", salary: 90 },
  { id: 4, name: "Dan", dept: "Sales", salary: 95 },
  { id: 5, name: "Eve", dept: "Marketing", salary: 80 },
];

describe("matches", () => {
  it("compares numerically and by string", () => {
    expect(matches(rows[0], { column: "salary", op: "gt", value: 100 })).toBe(true);
    expect(matches(rows[2], { column: "salary", op: "gt", value: 100 })).toBe(false);
    expect(matches(rows[0], { column: "dept", op: "eq", value: "Eng" })).toBe(true);
    expect(matches(rows[0], { column: "name", op: "contains", value: "lic" })).toBe(true);
    expect(matches(rows[0], { column: "dept", op: "in", value: ["Eng", "Sales"] })).toBe(true);
  });
});

describe("runQuery", () => {
  it("filters with where (ANDed)", () => {
    const out = runQuery(rows, {
      where: [
        { column: "dept", op: "eq", value: "Eng" },
        { column: "salary", op: "gte", value: 115 },
      ],
    });
    expect(out.map((r) => r.name)).toEqual(["Alice"]);
  });

  it("selects, orders and limits", () => {
    const out = runQuery(rows, {
      select: ["name", "salary"],
      order_by: { column: "salary", dir: "desc" },
      limit: 2,
    });
    expect(out).toEqual([
      { name: "Alice", salary: 120 },
      { name: "Bob", salary: 110 },
    ]);
  });

  it("groups and aggregates", () => {
    const out = runQuery(rows, {
      group_by: ["dept"],
      aggregate: [
        { fn: "count" },
        { fn: "avg", column: "salary", as: "avg_salary" },
        { fn: "max", column: "salary", as: "max_salary" },
      ],
      order_by: { column: "avg_salary", dir: "desc" },
    });
    expect(out[0]).toEqual({ dept: "Eng", count: 2, avg_salary: 115, max_salary: 120 });
    expect(out.find((r) => r.dept === "Sales")).toEqual({
      dept: "Sales",
      count: 2,
      avg_salary: 92.5,
      max_salary: 95,
    });
  });

  it("is read-only (does not mutate input)", () => {
    const before = JSON.stringify(rows);
    runQuery(rows, { order_by: { column: "salary" }, group_by: ["dept"] });
    expect(JSON.stringify(rows)).toBe(before);
  });

  it("caps output at hardCap", () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ i }));
    expect(runQuery(many, {}, 10)).toHaveLength(10);
  });
});

describe("aggregate", () => {
  it("counts groups", () => {
    const out = aggregate(rows, ["dept"], [{ fn: "count" }]);
    expect(out).toHaveLength(3);
  });
});

describe("fmtDisplay / toMarkdown", () => {
  it("formats epoch-ms date columns to ISO date", () => {
    const ms = Date.UTC(2021, 2, 1);
    expect(fmtDisplay("hired", ms, { hired: "date" })).toBe("2021-03-01");
    expect(fmtDisplay("salary", 120, { salary: "integer" })).toBe("120");
    expect(fmtDisplay("x", null)).toBe("");
  });

  it("escapes pipes and renders a table", () => {
    const md = toMarkdown([{ a: "x|y", b: 1 }], ["a", "b"]);
    expect(md).toContain("x\\|y");
    expect(md.split("\n")).toHaveLength(3);
  });
});
