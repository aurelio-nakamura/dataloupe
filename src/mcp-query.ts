/**
 * Read-only structured query engine used by the dataloupe MCP server.
 * Pure functions over already-parsed rows — no I/O, no SQL, no mutation.
 */
import type { Row } from "./types.js";

export type Op = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "contains" | "in";
export interface WhereClause {
  column: string;
  op: Op;
  value: unknown;
}
export type AggFn = "count" | "sum" | "avg" | "min" | "max";
export interface Agg {
  fn: AggFn;
  column?: string;
  as?: string;
}
export interface QuerySpec {
  select?: string[];
  where?: WhereClause[];
  order_by?: { column: string; dir?: "asc" | "desc" };
  limit?: number;
  offset?: number;
  group_by?: string[];
  aggregate?: Agg[];
}

export function cmp(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  const na = typeof a === "number" ? a : Number(a);
  const nb = typeof b === "number" ? b : Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b));
}

export function matches(row: Row, w: WhereClause): boolean {
  const v = row[w.column];
  switch (w.op) {
    case "eq":
      return cmp(v, w.value) === 0;
    case "ne":
      return cmp(v, w.value) !== 0;
    case "gt":
      return cmp(v, w.value) > 0;
    case "gte":
      return cmp(v, w.value) >= 0;
    case "lt":
      return cmp(v, w.value) < 0;
    case "lte":
      return cmp(v, w.value) <= 0;
    case "contains":
      return String(v ?? "")
        .toLowerCase()
        .includes(String(w.value ?? "").toLowerCase());
    case "in":
      return Array.isArray(w.value) ? w.value.some((x) => cmp(v, x) === 0) : false;
    default:
      return false;
  }
}

export function aggregate(rows: Row[], group_by: string[], aggs: Agg[]): Row[] {
  const groups = new Map<string, { key: Row; rows: Row[] }>();
  for (const r of rows) {
    const key = group_by.map((c) => String(r[c] ?? "\u0000")).join("\u0001");
    let g = groups.get(key);
    if (!g) {
      const keyRow: Row = {};
      for (const c of group_by) keyRow[c] = r[c];
      g = { key: keyRow, rows: [] };
      groups.set(key, g);
    }
    g.rows.push(r);
  }
  const out: Row[] = [];
  for (const { key, rows: grows } of groups.values()) {
    const rec: Row = { ...key };
    for (const a of aggs) {
      const label = a.as ?? `${a.fn}${a.column ? "_" + a.column : ""}`;
      if (a.fn === "count") {
        rec[label] = grows.length;
        continue;
      }
      const nums = grows
        .map((r) => Number(r[a.column as string]))
        .filter((n) => !Number.isNaN(n));
      if (a.fn === "sum") rec[label] = nums.reduce((s, n) => s + n, 0);
      else if (a.fn === "avg")
        rec[label] = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : null;
      else if (a.fn === "min") rec[label] = nums.length ? Math.min(...nums) : null;
      else if (a.fn === "max") rec[label] = nums.length ? Math.max(...nums) : null;
    }
    out.push(rec);
  }
  return out;
}

/** Apply a QuerySpec to rows. Always read-only; caps output at `hardCap` rows. */
export function runQuery(rows: Row[], q: QuerySpec, hardCap = 1000): Row[] {
  let out = rows;
  if (q.where && q.where.length)
    out = out.filter((r) => q.where!.every((w) => matches(r, w)));
  if (q.group_by && q.group_by.length)
    out = aggregate(out, q.group_by, q.aggregate ?? [{ fn: "count" }]);
  if (q.order_by) {
    const { column, dir } = q.order_by;
    const sign = dir === "desc" ? -1 : 1;
    out = [...out].sort((a, b) => sign * cmp(a[column], b[column]));
  }
  if (q.offset) out = out.slice(q.offset);
  out = out.slice(0, typeof q.limit === "number" ? q.limit : hardCap);
  if (q.select && q.select.length)
    out = out.map((r) => {
      const o: Row = {};
      for (const c of q.select!) o[c] = r[c];
      return o;
    });
  return out;
}

export function fmtDisplay(
  col: string,
  v: unknown,
  types?: Record<string, string>,
): string {
  if (v === null || v === undefined) return "";
  const t = types?.[col];
  if (
    (t === "date" || t === "datetime") &&
    typeof v === "number" &&
    Number.isFinite(v)
  ) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()))
      return t === "date" ? d.toISOString().slice(0, 10) : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export function toMarkdown(
  rows: Row[],
  columns?: string[],
  types?: Record<string, string>,
): string {
  if (!rows.length) return "_(0 rows)_";
  const cols = columns ?? Object.keys(rows[0]);
  const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const head = `| ${cols.join(" | ")} |`;
  const sep = `| ${cols.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${cols.map((c) => esc(fmtDisplay(c, r[c], types))).join(" | ")} |`)
    .join("\n");
  return [head, sep, body].join("\n");
}
