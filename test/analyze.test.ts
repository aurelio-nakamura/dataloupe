import { describe, expect, it } from "vitest";
import { analyzeColumn, coerce, inferType, isNullish } from "../src/analyze.js";

describe("isNullish", () => {
  it("treats empty and null-like strings as null", () => {
    for (const v of [null, undefined, "", "  ", "null", "NA", "NaN"]) {
      expect(isNullish(v)).toBe(true);
    }
    for (const v of [0, "0", "x", false]) {
      expect(isNullish(v)).toBe(false);
    }
  });
});

describe("inferType", () => {
  it("detects integers", () => {
    expect(inferType(["1", "2", "3", "-4"])).toBe("integer");
  });
  it("detects numbers", () => {
    expect(inferType(["1.5", "2", "3.14", "-4.2e3"])).toBe("number");
  });
  it("detects booleans", () => {
    expect(inferType(["true", "false", "TRUE", "False"])).toBe("boolean");
  });
  it("detects dates and datetimes", () => {
    expect(inferType(["2023-01-01", "2024-12-31"])).toBe("date");
    expect(inferType(["2023-01-01T10:00:00Z", "2024-12-31 23:59"])).toBe("datetime");
  });
  it("falls back to string", () => {
    expect(inferType(["apple", "banana", "42"])).toBe("string");
  });
  it("ignores nulls when inferring", () => {
    expect(inferType(["1", "", "2", "null", "3"])).toBe("integer");
  });
});

describe("coerce", () => {
  it("coerces numbers and rejects garbage", () => {
    expect(coerce("42", "integer")).toBe(42);
    expect(coerce("3.14", "number")).toBeCloseTo(3.14);
    expect(coerce("x", "number")).toBe(null);
  });
  it("coerces booleans", () => {
    expect(coerce("true", "boolean")).toBe(true);
    expect(coerce("FALSE", "boolean")).toBe(false);
  });
  it("coerces dates to epoch ms", () => {
    expect(coerce("2023-01-01", "date")).toBe(Date.parse("2023-01-01"));
  });
});

describe("analyzeColumn", () => {
  it("computes numeric stats and a histogram", () => {
    const s = analyzeColumn("x", "integer", [1, 2, 3, 4, 5, null]);
    expect(s.count).toBe(5);
    expect(s.nulls).toBe(1);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.mean).toBe(3);
    expect(s.median).toBe(3);
    expect(s.histogram).toBeDefined();
    expect(s.histogram!.counts.reduce((a, b) => a + b, 0)).toBe(5);
  });
  it("computes top values for categoricals", () => {
    const s = analyzeColumn("c", "string", ["a", "a", "b", "c", "a", "b"]);
    expect(s.top![0]).toEqual({ value: "a", count: 3 });
    expect(s.unique).toBe(3);
  });
});
