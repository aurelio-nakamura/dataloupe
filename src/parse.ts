import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import Papa from "papaparse";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { parseXlsx } from "./xlsx.js";
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

export function detectFormat(path: string, hint?: Format): Format {
  if (hint) return hint;
  const ext = extname(path).toLowerCase();
  switch (ext) {
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

export async function parseFile(path: string, opts: ParseOptions = {}): Promise<ParseResult> {
  const format = detectFormat(path, opts.format);
  const limit = opts.limit ?? Infinity;

  if (format === "parquet") {
    return parseParquet(path, limit);
  }

  if (format === "xlsx") {
    const { rows } = await parseXlsx(path, { sheet: opts.sheet, limit });
    const total = rows.length;
    let out = rows;
    let truncated = false;
    if (out.length > limit) {
      out = out.slice(0, limit);
      truncated = true;
    }
    return { rows: out, format: "xlsx", totalRowCount: total, truncated };
  }

  const text = await readFile(path, "utf8");
  return parseText(text, format, opts);
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

async function parseParquet(path: string, limit: number): Promise<ParseResult> {
  const file = await asyncBufferFromFile(path);
  const rowEnd = Number.isFinite(limit) ? limit : undefined;
  const rows = (await parquetReadObjects({ file, rowEnd })) as Row[];
  // Get total count cheaply from metadata is possible but parquetReadObjects
  // already respects rowEnd; determine truncation by reading count.
  return {
    rows: normalizeParquetRows(rows),
    format: "parquet",
    truncated: rowEnd !== undefined && rows.length >= rowEnd,
  };
}

function normalizeParquetRows(rows: Row[]): Row[] {
  return rows.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) {
      if (typeof v === "bigint") out[k] = Number(v);
      else out[k] = v;
    }
    return out;
  });
}
