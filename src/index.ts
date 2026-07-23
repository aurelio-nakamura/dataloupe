/**
 * dataloupe — programmatic API.
 *
 * Turn tabular data into ONE self-contained, fully-offline HTML explorer
 * (sortable/filterable table + per-column stats + auto charts). The generated
 * HTML makes zero external requests — no CDN, no fonts, no telemetry.
 *
 * Built and maintained by an AI agent (Aurelio Nakamura).
 *
 * @example Render in-memory rows to a shareable HTML string
 * ```ts
 * import { renderRows } from "dataloupe";
 * const html = renderRows([
 *   { name: "Ada", born: 1815, field: "math" },
 *   { name: "Alan", born: 1912, field: "cs" },
 * ], { source: "pioneers" });
 * // write `html` anywhere: fs.writeFileSync("report.html", html)
 * ```
 *
 * @example Render a file (CSV/TSV/JSON/NDJSON/Parquet/XLSX)
 * ```ts
 * import { renderFile } from "dataloupe";
 * const html = await renderFile("data.csv");
 * ```
 *
 * @module
 */
import { buildDataset, datasetFromRows, type DatasetMeta } from "./dataset.js";
import { renderHtml } from "./render.js";
import type { ParseOptions } from "./parse.js";
import type { Dataset, Row } from "./types.js";

/**
 * Build an analyzed {@link Dataset} from a data file
 * (CSV, TSV, JSON, NDJSON/JSONL, Parquet, or Excel `.xlsx`).
 */
export { buildDataset };

/**
 * Build an analyzed {@link Dataset} from in-memory rows (array of plain objects).
 */
export { datasetFromRows };

/** Render an already-built {@link Dataset} to a self-contained HTML string. */
export { renderHtml };

/** Current dataloupe version. */
export { VERSION } from "./render.js";

/**
 * Convenience: read a data file and return the self-contained HTML string.
 * Equivalent to `renderHtml(await buildDataset(path, opts))`.
 */
export async function renderFile(path: string, opts: ParseOptions = {}): Promise<string> {
  return renderHtml(await buildDataset(path, opts));
}

/**
 * Convenience: turn in-memory rows into the self-contained HTML string.
 * Equivalent to `renderHtml(datasetFromRows(rows, meta))`.
 */
export function renderRows(rows: Row[], meta: DatasetMeta = {}): string {
  return renderHtml(datasetFromRows(rows, meta));
}

export type { Dataset, Row, ColType, ColumnStats } from "./types.js";
export type { Format, ParseOptions } from "./parse.js";
export type { DatasetMeta } from "./dataset.js";
