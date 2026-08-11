// Browser-safe core for diffing two datasets into a structured result.
// No Node built-ins so this can be bundled for the browser playground.
import type { Dataset, Row } from "./types.js";

export type CellValue = unknown;

/** One column that changed within a matched (keyed) row. */
export interface CellChange {
  column: string;
  before: CellValue;
  after: CellValue;
}

/** A row that exists on both sides but with at least one differing cell. */
export interface ChangedRow {
  key: string;
  before: CellValue[]; // values in `columns` order
  after: CellValue[]; // values in `columns` order
  changed: string[]; // column names that differ
}

export interface DiffResult {
  columns: string[]; // union of columns, stable order (old first)
  keyColumns: string[]; // columns used to match rows ([] = matched by whole row)
  keyAuto: boolean; // true when keyColumns were auto-detected
  added: CellValue[][]; // rows only in `after`
  removed: CellValue[][]; // rows only in `before`
  changed: ChangedRow[]; // matched rows with differing cells
  unchanged: number; // count of identical matched rows
  counts: { added: number; removed: number; changed: number; unchanged: number };
  before: { source: string; rowCount: number };
  after: { source: string; rowCount: number };
}

export interface DiffOptions {
  /** Column name(s) that uniquely identify a row. Enables cell-level changes. */
  key?: string | string[];
}

function norm(v: unknown): string {
  if (v === null || v === undefined) return "\u0000";
  if (v instanceof Date) return "d:" + v.getTime();
  if (typeof v === "number") return "n:" + v;
  if (typeof v === "boolean") return "b:" + v;
  if (typeof v === "bigint") return "n:" + v.toString();
  return "s:" + String(v);
}

function rowKey(row: Row, cols: string[]): string {
  return cols.map((c) => norm(row[c])).join("\u0001");
}

function unionColumns(a: string[], b: string[]): string[] {
  const out = [...a];
  const seen = new Set(a);
  for (const c of b) if (!seen.has(c)) { seen.add(c); out.push(c); }
  return out;
}

/** A column is a usable key if it is non-null and unique across every row. */
function isUniqueKey(rows: Row[], col: string): boolean {
  if (rows.length === 0) return false;
  const seen = new Set<string>();
  for (const r of rows) {
    const v = r[col];
    if (v === null || v === undefined || v === "") return false;
    const k = norm(v);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
}

function autoDetectKey(cols: string[], before: Row[], after: Row[]): string[] {
  // Prefer a column that reads like an id, then any column unique on both sides.
  const idish = cols.filter((c) => /(^|[_\s-])(id|key|uuid|guid|slug|code)$/i.test(c) || /^id$/i.test(c));
  for (const c of [...idish, ...cols]) {
    if (isUniqueKey(before, c) && isUniqueKey(after, c)) return [c];
  }
  return [];
}

function toArray(row: Row, cols: string[]): CellValue[] {
  return cols.map((c) => (row[c] === undefined ? null : row[c]));
}

/**
 * Compute a structured diff between two datasets. When a key is given (or one is
 * auto-detected) rows are matched by that key and cell-level changes are
 * reported; otherwise rows are matched by whole-row equality (added/removed only).
 */
export function diffDatasets(beforeDs: Dataset, afterDs: Dataset, opts: DiffOptions = {}): DiffResult {
  const columns = unionColumns(beforeDs.columns, afterDs.columns);
  const before = beforeDs.rows;
  const after = afterDs.rows;

  let keyColumns: string[] = [];
  let keyAuto = false;
  if (opts.key !== undefined) {
    keyColumns = Array.isArray(opts.key) ? opts.key : [opts.key];
    keyColumns = keyColumns.filter((k) => k !== "");
  }
  if (keyColumns.length === 0) {
    const auto = autoDetectKey(columns, before, after);
    if (auto.length) { keyColumns = auto; keyAuto = true; }
  }

  const added: CellValue[][] = [];
  const removed: CellValue[][] = [];
  const changed: ChangedRow[] = [];
  let unchanged = 0;

  if (keyColumns.length > 0) {
    const beforeMap = new Map<string, Row>();
    for (const r of before) beforeMap.set(rowKey(r, keyColumns), r);
    const afterMap = new Map<string, Row>();
    for (const r of after) afterMap.set(rowKey(r, keyColumns), r);

    for (const [k, aRow] of afterMap) {
      const bRow = beforeMap.get(k);
      if (!bRow) { added.push(toArray(aRow, columns)); continue; }
      const diffCols: string[] = [];
      for (const c of columns) if (norm(bRow[c]) !== norm(aRow[c])) diffCols.push(c);
      if (diffCols.length === 0) unchanged++;
      else changed.push({ key: k, before: toArray(bRow, columns), after: toArray(aRow, columns), changed: diffCols });
    }
    for (const [k, bRow] of beforeMap) {
      if (!afterMap.has(k)) removed.push(toArray(bRow, columns));
    }
  } else {
    // Whole-row multiset diff.
    const beforeCounts = new Map<string, { row: Row; n: number }>();
    for (const r of before) {
      const k = rowKey(r, columns);
      const e = beforeCounts.get(k);
      if (e) e.n++; else beforeCounts.set(k, { row: r, n: 1 });
    }
    for (const r of after) {
      const k = rowKey(r, columns);
      const e = beforeCounts.get(k);
      if (e && e.n > 0) { e.n--; unchanged++; }
      else added.push(toArray(r, columns));
    }
    for (const { row, n } of beforeCounts.values()) {
      for (let i = 0; i < n; i++) removed.push(toArray(row, columns));
    }
  }

  return {
    columns,
    keyColumns,
    keyAuto,
    added,
    removed,
    changed,
    unchanged,
    counts: { added: added.length, removed: removed.length, changed: changed.length, unchanged },
    before: { source: beforeDs.source, rowCount: beforeDs.rowCount },
    after: { source: afterDs.source, rowCount: afterDs.rowCount },
  };
}
