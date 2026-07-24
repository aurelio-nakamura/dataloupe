import { analyzeColumn, coerce, inferType } from "./analyze.js";
import type { ColType, Dataset, Row } from "./types.js";
import { parseFile, parseText, type Format, type ParseOptions } from "./parse.js";

const TYPE_SAMPLE = 5000;

export interface DatasetMeta {
  /** Format label shown in the UI (e.g. "csv", "json", "memory"). */
  format?: string;
  /** Source label shown in the UI (e.g. a file path or dataset name). */
  source?: string;
  /** True if `rows` is a truncated view of a larger source. */
  truncated?: boolean;
  /** Total row count in the source if larger than the loaded rows. */
  totalRowCount?: number;
}

/**
 * Build a fully-analyzed {@link Dataset} from in-memory rows (an array of plain
 * objects). This is the core used by {@link buildDataset}; call it directly when
 * your data already lives in memory (query results, generated data, etc.).
 */
export function datasetFromRows(rows: Row[], meta: DatasetMeta = {}): Dataset {
  // Collect column order (union, preserving first-seen order)
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        columns.push(k);
      }
    }
  }

  // Infer types from a sample
  const sample = rows.slice(0, TYPE_SAMPLE);
  const types: Record<string, ColType> = {};
  for (const col of columns) {
    types[col] = inferType(sample.map((r) => r[col]));
  }

  // Coerce all rows to typed values
  const typed: Row[] = rows.map((r) => {
    const out: Row = {};
    for (const col of columns) out[col] = coerce(r[col], types[col]);
    return out;
  });

  // Stats per column
  const stats = columns.map((col) =>
    analyzeColumn(
      col,
      types[col],
      typed.map((r) => r[col]),
    ),
  );

  return {
    columns,
    types,
    rows: typed,
    stats,
    rowCount: typed.length,
    totalRowCount:
      meta.totalRowCount && meta.totalRowCount > typed.length ? meta.totalRowCount : undefined,
    truncated: meta.truncated ?? false,
    source: meta.source ?? "memory",
    format: meta.format ?? "memory",
  };
}

export async function buildDataset(path: string, opts: ParseOptions = {}): Promise<Dataset> {
  const { rows, format, totalRowCount, truncated } = await parseFile(path, opts);
  return datasetFromRows(rows, { format, source: path, totalRowCount, truncated });
}

/**
 * Build a {@link Dataset} from a text string in a text-based format
 * (csv/tsv/json/ndjson). Used for piped stdin input.
 */
export function buildDatasetFromText(
  text: string,
  format: Format,
  opts: ParseOptions = {},
  source = "stdin",
): Dataset {
  const { rows, format: fmt, totalRowCount, truncated } = parseText(text, format, opts);
  return datasetFromRows(rows, { format: fmt, source, totalRowCount, truncated });
}

