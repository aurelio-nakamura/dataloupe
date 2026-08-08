import { unzipSync } from "fflate";
import type { Row } from "./types.js";

/**
 * Minimal, dependency-light .xlsx reader.
 *
 * .xlsx is a ZIP of XML parts. We unzip with fflate (zero-dep) and pull just
 * what a data explorer needs: the first worksheet's cells, the shared-string
 * table, and enough of the style table to recognise date-formatted numbers.
 * Values are emitted as plain JS strings/numbers/booleans (dates as ISO
 * strings) so the rest of the pipeline treats them exactly like CSV rows.
 */

const decoder = new TextDecoder("utf-8");

function xmlDecode(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : undefined;
}

/** "AB12" -> zero-based column index (AB -> 27). */
function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]+$/, "");
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}

/** Concatenate all <t> text runs inside a shared-string / inline-string block. */
function textFromRuns(xml: string): string {
  let out = "";
  const re = /<t\b[^>]*\/>|<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    if (m[1] !== undefined) out += xmlDecode(m[1]);
  }
  return out;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si\b[^>]*\/>|<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push(m[1] !== undefined ? textFromRuns(m[1]) : "");
  }
  return out;
}

// Built-in numFmtIds that denote dates/times (ECMA-376 §18.8.30).
const BUILTIN_DATE_FMT = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

function looksLikeDateFmt(code: string): boolean {
  // Strip quoted literals, [color]/[condition] blocks and escaped chars.
  const stripped = code
    .replace(/"[^"]*"/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\./g, "");
  return /[ymdhs]/i.test(stripped);
}

interface StyleInfo {
  isDate: boolean[]; // indexed by cellXfs (s) index
}

function parseStyles(xml: string | undefined): StyleInfo {
  if (!xml) return { isDate: [] };
  const customDate = new Map<number, boolean>();
  const numFmts = xml.match(/<numFmt\b[^>]*\/?>/g) ?? [];
  for (const nf of numFmts) {
    const id = Number(attr(nf, "numFmtId"));
    const code = attr(nf, "formatCode");
    if (Number.isFinite(id) && code !== undefined) {
      customDate.set(id, looksLikeDateFmt(xmlDecode(code)));
    }
  }
  const isDate: boolean[] = [];
  const cellXfsBlock = xml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  if (cellXfsBlock) {
    const xfs = cellXfsBlock[1].match(/<xf\b[^>]*\/?>/g) ?? [];
    for (const xf of xfs) {
      const id = Number(attr(xf, "numFmtId") ?? "0");
      isDate.push(BUILTIN_DATE_FMT.has(id) || customDate.get(id) === true);
    }
  }
  return { isDate };
}

/** Convert an Excel date serial to an ISO string (UTC-based, no tz shift). */
function serialToIso(serial: number, date1904: boolean): string {
  const epochDiff = date1904 ? 24107 : 25569; // days from Excel epoch to 1970-01-01
  const ms = Math.round((serial - epochDiff) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return String(serial);
  const iso = d.toISOString();
  // Date-only serials (no fractional part) -> YYYY-MM-DD
  return Number.isInteger(serial) ? iso.slice(0, 10) : iso.replace(/\.\d{3}Z$/, "Z");
}

export interface XlsxResult {
  rows: Row[];
  sheetNames: string[];
  sheet: string;
}

export async function parseXlsx(path: string, opts: { sheet?: string; limit?: number } = {}): Promise<XlsxResult> {
  // Lazy Node import so this module stays browser-bundle-safe; the browser
  // playground calls parseXlsxBytes directly and never reaches this path.
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(path);
  return parseXlsxBytes(new Uint8Array(buf), opts);
}

/** Parse an .xlsx workbook from in-memory bytes. Browser-safe (no Node built-ins). */
export function parseXlsxBytes(
  bytes: Uint8Array,
  opts: { sheet?: string; limit?: number } = {},
): XlsxResult {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("Not a valid .xlsx file (could not unzip). .xls (legacy binary) is not supported.");
  }
  const text = (name: string): string | undefined => {
    const f = files[name];
    return f ? decoder.decode(f) : undefined;
  };

  const workbook = text("xl/workbook.xml");
  if (!workbook) throw new Error("Not a valid .xlsx workbook (missing xl/workbook.xml).");
  const date1904 = /date1904="(1|true)"/.test(workbook);

  // Sheets in document order: name + r:id
  const sheetTags = workbook.match(/<sheet\b[^>]*\/?>/g) ?? [];
  const sheets = sheetTags.map((t) => ({ name: attr(t, "name") ?? "", rid: attr(t, "r:id") ?? "" }));
  if (sheets.length === 0) throw new Error("Workbook has no sheets.");
  const sheetNames = sheets.map((s) => s.name);

  // Resolve r:id -> worksheet path via workbook rels
  const rels = text("xl/_rels/workbook.xml.rels") ?? "";
  const relMap = new Map<string, string>();
  for (const r of rels.match(/<Relationship\b[^>]*\/?>/g) ?? []) {
    const id = attr(r, "Id");
    const target = attr(r, "Target");
    if (id && target) relMap.set(id, target.replace(/^\//, "").replace(/^xl\//, ""));
  }

  let chosen = sheets[0];
  if (opts.sheet) {
    const found = sheets.find((s) => s.name === opts.sheet);
    if (!found) {
      throw new Error(`Sheet "${opts.sheet}" not found. Available: ${sheetNames.join(", ")}`);
    }
    chosen = found;
  }
  let target = relMap.get(chosen.rid) ?? "worksheets/sheet1.xml";
  if (!target.startsWith("worksheets/") && !target.includes("/")) target = "worksheets/" + target;
  const sheetXml = text("xl/" + target) ?? text("xl/worksheets/sheet1.xml");
  if (!sheetXml) throw new Error("Could not locate worksheet XML.");

  const shared = parseSharedStrings(text("xl/sharedStrings.xml"));
  const styles = parseStyles(text("xl/styles.xml"));

  // Parse rows/cells into a sparse grid.
  const grid: unknown[][] = [];
  const rowRe = /<row\b[^>]*\/>|<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  const limit = opts.limit ?? Infinity;
  let m: RegExpExecArray | null;
  let maxCol = 0;
  while ((m = rowRe.exec(sheetXml)) !== null) {
    // stop once we've collected header + limit data rows
    if (grid.length > limit) break;
    const body = m[2] ?? "";
    const cells: unknown[] = [];
    const cellRe = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let c: RegExpExecArray | null;
    while ((c = cellRe.exec(body)) !== null) {
      const attrs = c[1] ?? c[2] ?? "";
      const inner = c[3] ?? "";
      const ref = attr(attrs, "r");
      const ci = ref ? colIndex(ref) : cells.length;
      const t = attr(attrs, "t");
      let value: unknown = null;
      if (t === "inlineStr") {
        value = textFromRuns(inner);
      } else {
        const vm = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/);
        const raw = vm ? xmlDecode(vm[1]) : "";
        if (raw === "") {
          value = null;
        } else if (t === "s") {
          value = shared[Number(raw)] ?? "";
        } else if (t === "b") {
          value = raw === "1";
        } else if (t === "str" || t === "e") {
          value = raw;
        } else {
          // numeric (default) — may be a date serial
          const s = Number(attr(attrs, "s") ?? "-1");
          const num = Number(raw);
          if (s >= 0 && styles.isDate[s] && Number.isFinite(num)) {
            value = serialToIso(num, date1904);
          } else {
            value = Number.isFinite(num) ? num : raw;
          }
        }
      }
      cells[ci] = value;
      if (ci + 1 > maxCol) maxCol = ci + 1;
    }
    grid.push(cells);
  }

  if (grid.length === 0) return { rows: [], sheetNames, sheet: chosen.name };

  // First row = header.
  const header = grid[0];
  const names: string[] = [];
  const usedNames = new Set<string>();
  for (let i = 0; i < maxCol; i++) {
    const base =
      header[i] == null || String(header[i]).trim() === "" ? `column_${i + 1}` : String(header[i]).trim();
    let candidate = base;
    let n = 2;
    while (usedNames.has(candidate)) candidate = `${base}_${n++}`;
    usedNames.add(candidate);
    names.push(candidate);
  }

  const rows: Row[] = [];
  for (let r = 1; r < grid.length && rows.length < limit; r++) {
    const cells = grid[r];
    const obj: Row = {};
    let allEmpty = true;
    for (let i = 0; i < maxCol; i++) {
      const v = cells[i] ?? null;
      obj[names[i]] = v;
      if (v !== null && v !== "") allEmpty = false;
    }
    if (!allEmpty) rows.push(obj);
  }

  return { rows, sheetNames, sheet: chosen.name };
}
