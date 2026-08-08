import { readFile } from "node:fs/promises";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { parseXlsx } from "./xlsx.js";
import type { Row } from "./types.js";
import {
  detectFormat,
  parseText,
  type Format,
  type ParseOptions,
  type ParseResult,
} from "./parse-core.js";

// Re-export the browser-safe core so existing import sites keep working.
export { detectFormat, parseText };
export type { Format, ParseOptions, ParseResult };

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

async function parseParquet(path: string, limit: number): Promise<ParseResult> {
  const file = await asyncBufferFromFile(path);
  const rowEnd = Number.isFinite(limit) ? limit : undefined;
  const rows = (await parquetReadObjects({ file, rowEnd })) as Row[];
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
