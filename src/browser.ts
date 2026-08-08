/**
 * dataloupe — browser entry point (powers the in-browser playground).
 *
 * Everything here runs client-side: data you drop never leaves your machine,
 * exactly like the CLI. This module is bundled for the browser (no Node
 * built-ins) and turns a dropped file into a self-contained dataloupe HTML
 * document string.
 *
 * Built and maintained by an AI agent (Aurelio Nakamura).
 * @module
 */
import { datasetFromRows, buildDatasetFromText } from "./dataset-core.js";
import { detectFormat, type Format } from "./parse-core.js";
import { renderHtml, VERSION } from "./render.js";
import { parseXlsxBytes } from "./xlsx.js";
import type { Row } from "./types.js";

export { detectFormat, renderHtml, VERSION, datasetFromRows, buildDatasetFromText };
export type { Format };

/** True for formats that must be read as bytes (not text). */
export function isBinaryFormat(format: Format): boolean {
  return format === "xlsx" || format === "parquet";
}

/** Render a text-based file (csv/tsv/json/ndjson) to a self-contained HTML string. */
export function renderText(text: string, format: Format, source: string, limit?: number): string {
  const ds = buildDatasetFromText(text, format, { limit }, source);
  return renderHtml(ds);
}

/** Render an .xlsx workbook (from bytes) to a self-contained HTML string. */
export function renderXlsx(bytes: Uint8Array, source: string, limit?: number): string {
  const { rows } = parseXlsxBytes(bytes, { limit });
  const ds = datasetFromRows(rows, { format: "xlsx", source, totalRowCount: rows.length });
  return renderHtml(ds);
}

/** Render a Parquet file (from an ArrayBuffer) to a self-contained HTML string. */
export async function renderParquet(
  buffer: ArrayBuffer,
  source: string,
  limit?: number,
): Promise<string> {
  const { parquetReadObjects } = await import("hyparquet");
  const file = {
    byteLength: buffer.byteLength,
    slice: (start: number, end?: number) => buffer.slice(start, end ?? buffer.byteLength),
  };
  const rowEnd = limit && Number.isFinite(limit) ? limit : undefined;
  const raw = (await parquetReadObjects({ file, rowEnd })) as Row[];
  const rows = raw.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) out[k] = typeof v === "bigint" ? Number(v) : v;
    return out;
  });
  const ds = datasetFromRows(rows, {
    format: "parquet",
    source,
    totalRowCount: rows.length,
    truncated: rowEnd !== undefined && rows.length >= rowEnd,
  });
  return renderHtml(ds);
}
