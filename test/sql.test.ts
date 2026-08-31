import { describe, it, expect } from "vitest";
import { parseSql } from "../src/sql.js";
import { runQuery } from "../src/mcp-query.js";

const rows = [
  { id: 1, name: "Alice", dept: "Eng", salary: 120 },
  { id: 2, name: "Bob", dept: "Eng", salary: 110 },
  { id: 3, name: "Carol", dept: "Sales", salary: 90 },
  { id: 4, name: "Dan", dept: "Sales", salary: 95 },
  { id: 5, name: "Eve", dept: "Marketing", salary: 80 },
];
const cols = ["id", "name", "dept", "salary"];

function run(sql: string) {
  const r = parseSql(sql, cols);
  if (r.error) throw new Error(r.error);
  return runQuery(rows, r.spec!, 10000);
}

describe("parseSql — select / projection", () => {
  it("SELECT * returns all rows and all columns", () => {
    const r = parseSql("SELECT * FROM data", cols);
    expect(r.error).toBeUndefined();
    expect(runQuery(rows, r.spec!)).toHaveLength(5);
    expect(r.columns).toEqual(cols);
  });

  it("projects a column subset", () => {
    const r = parseSql("SELECT name, salary", cols);
    expect(r.columns).toEqual(["name", "salary"]);
    const out = run("SELECT name, salary");
    expect(Object.keys(out[0])).toEqual(["name", "salary"]);
  });

  it("rejects unknown columns", () => {
    expect(parseSql("SELECT bogus", cols).error).toMatch(/Unknown column/);
  });
});

describe("parseSql — where", () => {
  it("numeric comparison", () => {
    expect(run("SELECT name WHERE salary > 100").map((r) => r.name)).toEqual(["Alice", "Bob"]);
  });
  it("!= and <> are equivalent", () => {
    expect(run("SELECT id WHERE dept != 'Eng'")).toHaveLength(3);
    expect(run("SELECT id WHERE dept <> 'Eng'")).toHaveLength(3);
  });
  it("AND-combines predicates", () => {
    const out = run("SELECT name WHERE dept = 'Sales' AND salary > 92");
    expect(out.map((r) => r.name)).toEqual(["Dan"]);
  });
  it("LIKE maps to substring (strips %)", () => {
    expect(run("SELECT name WHERE name LIKE '%ar%'").map((r) => r.name)).toEqual(["Carol"]);
  });
  it("IN list", () => {
    expect(run("SELECT id WHERE dept IN ('Eng','Marketing')")).toHaveLength(3);
  });
});

describe("parseSql — aggregate / group by", () => {
  it("COUNT(*) grouped", () => {
    const out = run("SELECT dept, COUNT(*) FROM data GROUP BY dept ORDER BY dept");
    expect(out).toEqual([
      { dept: "Eng", count: 2 },
      { dept: "Marketing", count: 1 },
      { dept: "Sales", count: 2 },
    ]);
  });
  it("AVG with alias and ORDER BY alias DESC", () => {
    const r = parseSql("SELECT dept, AVG(salary) AS avg_pay GROUP BY dept ORDER BY avg_pay DESC", cols);
    expect(r.error).toBeUndefined();
    expect(r.columns).toEqual(["dept", "avg_pay"]);
    const out = runQuery(rows, r.spec!, 10000);
    expect(out[0]).toEqual({ dept: "Eng", avg_pay: 115 });
    expect(out.map((x) => x.dept)).toEqual(["Eng", "Sales", "Marketing"]);
  });
  it("bare column not in GROUP BY is rejected", () => {
    expect(parseSql("SELECT name, COUNT(*) GROUP BY dept", cols).error).toMatch(/GROUP BY/);
  });
});

describe("parseSql — order / limit / offset", () => {
  it("ORDER BY DESC + LIMIT", () => {
    expect(run("SELECT name WHERE 1=1".replace("WHERE 1=1", "") + " ORDER BY salary DESC LIMIT 2").map((r) => r.name)).toEqual(["Alice", "Bob"]);
  });
  it("LIMIT and OFFSET together", () => {
    const out = run("SELECT id ORDER BY id ASC LIMIT 2 OFFSET 1");
    expect(out.map((r) => r.id)).toEqual([2, 3]);
  });
});

describe("parseSql — errors", () => {
  it("empty query", () => {
    expect(parseSql("   ", cols).error).toMatch(/Empty/);
  });
  it("must start with SELECT", () => {
    expect(parseSql("DELETE FROM data", cols).error).toMatch(/SELECT/);
  });
  it("unterminated string", () => {
    expect(parseSql("SELECT name WHERE name = 'Al", cols).error).toMatch(/Unterminated/);
  });
  it("trailing garbage", () => {
    expect(parseSql("SELECT * FROM data foo bar", cols).error).toBeTruthy();
  });
  it("trailing semicolon is tolerated", () => {
    expect(parseSql("SELECT * FROM data;", cols).error).toBeUndefined();
  });
});
