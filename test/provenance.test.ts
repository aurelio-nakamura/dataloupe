import { describe, expect, it } from "vitest";
import { describeQuery, hashString } from "../src/provenance.js";
import type { QuerySpec } from "../src/mcp-query.js";

describe("provenance", () => {
  it("hashString matches a known SHA-256 and byte length", () => {
    const { sha256, bytes } = hashString("abc");
    // SHA-256("abc")
    expect(sha256).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(bytes).toBe(3);
  });

  it("describeQuery lists filter, group-by, order, and limit as ordered steps", () => {
    const q: QuerySpec = {
      where: [{ column: "amount", op: "gt", value: 100 }],
      group_by: ["category"],
      aggregate: [{ fn: "sum", column: "amount", as: "total" }],
      order_by: { column: "total", dir: "desc" },
      limit: 5,
    };
    const steps = describeQuery(q);
    expect(steps).toEqual([
      'Filter: amount gt 100',
      "Group by category — sum(amount) as total",
      "Order by total desc",
      "Limit 5",
    ]);
  });

  it("describeQuery returns no steps for an empty query", () => {
    expect(describeQuery({})).toEqual([]);
  });
});
