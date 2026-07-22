import { analyzeColumn, coerce, inferType } from "./analyze.js";
import type { ColType, Dataset, Row } from "./types.js";
import { parseFile, type ParseOptions } from "./parse.js";

const TYPE_SAMPLE = 5000;

export async function buildDataset(path: string, opts: ParseOptions = {}): Promise<Dataset> {
  const { rows, format, totalRowCount, truncated } = await parseFile(path, opts);

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
    totalRowCount: totalRowCount && totalRowCount > typed.length ? totalRowCount : undefined,
    truncated,
    source: path,
    format,
  };
}
