// Browser-safe parsing core: text formats only (csv/tsv/json/ndjson).
// Zero Node built-ins here so this module can be bundled for the browser.
// File-path / binary (parquet, xlsx) parsing lives in parse.ts.
import Papa from "papaparse";
import type { Row } from "./types.js";

export type Format = "csv" | "tsv" | "json" | "ndjson" | "parquet" | "xlsx";

export interface ParseResult {
  rows: Row[];
  format: Format;
  totalRowCount?: number;
  truncated: boolean;
}

export interface ParseOptions {
  format?: Format;
  limit?: number; // max rows to load
  delimiter?: string;
  sheet?: string; // xlsx: worksheet name (default: first sheet)
}

/** Lowercase file extension including the leading dot, or "" if none. */
export function extLower(path: string): string {
  const base = path.replace(/[?#].*$/, "").split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot).toLowerCase() : "";
}

export function detectFormat(path: string, hint?: Format): Format {
  if (hint) return hint;
  switch (extLower(path)) {
    case ".csv":
      return "csv";
    case ".tsv":
    case ".tab":
      return "tsv";
    case ".ndjson":
    case ".jsonl":
      return "ndjson";
    case ".json":
      return "json";
    case ".parquet":
    case ".pq":
      return "parquet";
    case ".xlsx":
    case ".xlsm":
      return "xlsx";
    default:
      return "csv";
  }
}

/**
 * Parse already-in-memory text for a text-based format (csv/tsv/json/ndjson).
 * Used for both file reads and streamed stdin. Binary formats (parquet/xlsx)
 * are not supported here — read those from a file path.
 */
export function parseText(text: string, format: Format, opts: ParseOptions = {}): ParseResult {
  const limit = opts.limit ?? Infinity;
  switch (format) {
    case "csv":
    case "tsv":
      return parseDelimited(text, format, limit, opts.delimiter);
    case "ndjson":
      return parseNdjson(text, limit);
    case "json":
      return parseJson(text, limit);
    case "parquet":
    case "xlsx":
      throw new Error(`${format} cannot be read from stdin; pass a file path instead`);
    default:
      return parseDelimited(text, "csv", limit);
  }
}

function parseDelimited(
  text: string,
  format: Format,
  limit: number,
  delimiter?: string,
): ParseResult {
  const res = Papa.parse<Row>(text, {
    header: true,
    delimiter: delimiter ?? (format === "tsv" ? "\t" : ""),
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  let rows = res.data as Row[];
  const total = rows.length;
  let truncated = false;
  if (rows.length > limit) {
    rows = rows.slice(0, limit);
    truncated = true;
  }
  return { rows, format, totalRowCount: total, truncated };
}

function parseNdjson(text: string, limit: number): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const total = lines.length;
  const rows: Row[] = [];
  for (const line of lines) {
    if (rows.length >= limit) break;
    try {
      rows.push(JSON.parse(line));
    } catch {
      /* skip malformed line */
    }
  }
  return { rows, format: "ndjson", totalRowCount: total, truncated: total > rows.length };
}

function parseJson(text: string, limit: number): ParseResult {
  const data = JSON.parse(text);
  let arr: unknown[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (data && typeof data === "object") {
    // find first array-of-objects property, else wrap the object
    const arrayProp = Object.values(data).find(
      (v) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object",
    );
    arr = (arrayProp as unknown[]) ?? [data];
  } else {
    arr = [data];
  }
  const total = arr.length;
  let rows = arr.map((r) => (r && typeof r === "object" ? (r as Row) : { value: r }));
  let truncated = false;
  if (rows.length > limit) {
    rows = rows.slice(0, limit);
    truncated = true;
  }
  return { rows, format: "json", totalRowCount: total, truncated };
}
