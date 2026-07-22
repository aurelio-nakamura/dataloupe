import type { ColType, ColumnStats, Row } from "./types.js";

const INT_RE = /^[+-]?\d+$/;
const NUM_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_RE =
  /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;

export function isNullish(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    (typeof v === "string" && (v.trim() === "" || v.trim().toLowerCase() === "null" || v.trim().toLowerCase() === "na" || v.trim().toLowerCase() === "nan"))
  );
}

/** Infer a column type from a sample of raw (possibly string) values. */
export function inferType(values: unknown[]): ColType {
  let n = 0;
  let ints = 0;
  let nums = 0;
  let bools = 0;
  let dates = 0;
  let datetimes = 0;
  for (const raw of values) {
    if (isNullish(raw)) continue;
    n++;
    if (typeof raw === "boolean") {
      bools++;
      continue;
    }
    if (typeof raw === "number") {
      nums++;
      if (Number.isInteger(raw)) ints++;
      continue;
    }
    const v = String(raw).trim();
    const low = v.toLowerCase();
    if (low === "true" || low === "false") {
      bools++;
      continue;
    }
    if (INT_RE.test(v)) {
      ints++;
      nums++;
      continue;
    }
    if (NUM_RE.test(v)) {
      nums++;
      continue;
    }
    if (DATETIME_RE.test(v)) {
      datetimes++;
      continue;
    }
    if (DATE_RE.test(v)) {
      dates++;
      continue;
    }
  }
  if (n === 0) return "string";
  const frac = (x: number) => x / n;
  if (frac(bools) >= 0.99) return "boolean";
  if (frac(datetimes) >= 0.95) return "datetime";
  if (frac(dates) >= 0.95) return "date";
  if (frac(ints) >= 0.95) return "integer";
  if (frac(nums) >= 0.95) return "number";
  return "string";
}

export function coerce(raw: unknown, type: ColType): unknown {
  if (isNullish(raw)) return null;
  switch (type) {
    case "integer":
    case "number": {
      if (typeof raw === "number") return raw;
      const n = Number(String(raw).trim());
      return Number.isNaN(n) ? null : n;
    }
    case "boolean": {
      if (typeof raw === "boolean") return raw;
      const low = String(raw).trim().toLowerCase();
      if (low === "true") return true;
      if (low === "false") return false;
      return null;
    }
    case "date":
    case "datetime": {
      if (raw instanceof Date) return raw.getTime();
      if (typeof raw === "number") return raw;
      const t = Date.parse(String(raw).trim());
      return Number.isNaN(t) ? null : t;
    }
    default:
      return typeof raw === "string" ? raw : String(raw);
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function fmtDate(ms: number, withTime: boolean): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(ms);
  const iso = d.toISOString();
  return withTime ? iso.replace("T", " ").replace(".000Z", "Z") : iso.slice(0, 10);
}

/** Compute stats for one already-coerced column. */
export function analyzeColumn(name: string, type: ColType, values: unknown[]): ColumnStats {
  let nulls = 0;
  const present: unknown[] = [];
  for (const v of values) {
    if (v === null || v === undefined) nulls++;
    else present.push(v);
  }
  const count = present.length;
  const uniqueSet = new Set<unknown>();
  for (const v of present) {
    uniqueSet.add(v);
    if (uniqueSet.size > 100000) break;
  }
  const stats: ColumnStats = {
    name,
    type,
    count,
    nulls,
    unique: uniqueSet.size,
    uniqueApprox: uniqueSet.size > 100000,
  };

  if (type === "integer" || type === "number") {
    const nums = present.filter((v) => typeof v === "number") as number[];
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.mean = mean;
      stats.median = quantile(sorted, 0.5);
      stats.std = Math.sqrt(variance);
      stats.histogram = buildHistogram(sorted);
    }
  } else if (type === "date" || type === "datetime") {
    const nums = present.filter((v) => typeof v === "number") as number[];
    if (nums.length) {
      const sorted = [...nums].sort((a, b) => a - b);
      stats.min = sorted[0];
      stats.max = sorted[sorted.length - 1];
      stats.minLabel = fmtDate(sorted[0], type === "datetime");
      stats.maxLabel = fmtDate(sorted[sorted.length - 1], type === "datetime");
      stats.histogram = buildHistogram(sorted);
    }
  } else {
    // categorical / boolean / string: top values
    const counts = new Map<string, number>();
    for (const v of present) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    stats.top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([value, count]) => ({ value, count }));
  }
  return stats;
}

function buildHistogram(sorted: number[]): { bins: number[]; counts: number[] } {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return { bins: [min, max], counts: [sorted.length] };
  const n = Math.min(30, Math.max(5, Math.ceil(Math.sqrt(sorted.length))));
  const width = (max - min) / n;
  const bins: number[] = [];
  for (let i = 0; i <= n; i++) bins.push(min + i * width);
  const counts = new Array(n).fill(0);
  for (const v of sorted) {
    let idx = Math.floor((v - min) / width);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  return { bins, counts };
}
