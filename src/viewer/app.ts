// dataloupe viewer — vanilla TS, no runtime deps. Runs fully offline.
import { parseSql } from "../sql.js";
import { runQuery } from "../mcp-query.js";
import type { Row } from "../types.js";
type ColType = "integer" | "number" | "boolean" | "date" | "datetime" | "string";
interface ColumnStats {
  name: string; type: ColType; count: number; nulls: number; unique: number; uniqueApprox: boolean;
  min?: number; max?: number; mean?: number; median?: number; std?: number;
  histogram?: { bins: number[]; counts: number[] };
  top?: { value: string; count: number }[];
  minLabel?: string; maxLabel?: string;
}
interface Payload {
  columns: string[]; types: Record<string, ColType>; rows: any[][];
  stats: ColumnStats[]; rowCount: number; totalRowCount?: number; truncated: boolean;
  source: string; format: string; generatedAt: string; version: string;
  title?: string; note?: string;
  provenance?: { sha256?: string; sourceBytes?: number; tool?: string; steps?: string[] };
}

const D = (window as any).__DATALOUPE__ as Payload;
const $ = (sel: string, el: ParentNode = document) => el.querySelector(sel) as HTMLElement;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const u = ["KB", "MB", "GB", "TB"];
  let i = -1, v = n;
  do { v /= 1024; i++; } while (v >= 1024 && i < u.length - 1);
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`;
}

const isNum = (t: ColType) => t === "integer" || t === "number";
const isDate = (t: ColType) => t === "date" || t === "datetime";

function fmtNum(n: number): string {
  if (!isFinite(n)) return String(n);
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toLocaleString();
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-4 || a >= 1e12)) return n.toExponential(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
function fmtDateVal(ms: number, t: ColType): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return String(ms);
  const iso = d.toISOString();
  return t === "datetime" ? iso.replace("T", " ").replace(".000Z", "Z") : iso.slice(0, 10);
}
function fmtCell(v: any, t: ColType): string {
  if (v === null || v === undefined) return "";
  if (isNum(t)) return fmtNum(v as number);
  if (isDate(t)) return fmtDateVal(v as number, t);
  if (t === "boolean") return v ? "true" : "false";
  return String(v);
}
function abbr(n: number): string {
  if (n < 1000) return String(n);
  const u = ["k", "M", "B", "T"]; let i = -1; let x = n;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return x.toFixed(x < 10 ? 1 : 0) + u[i];
}

// ---- SVG chart helpers ----
function histSvg(h: { bins: number[]; counts: number[] }, w: number, height: number, color: string, type?: ColType): string {
  const n = h.counts.length; const max = Math.max(...h.counts, 1);
  const gap = n > 40 ? 0 : 1; const bw = w / n;
  const fmtEdge = type && isDate(type) ? (v: number) => fmtDateVal(v, type) : fmtNum;
  let bars = "";
  for (let i = 0; i < n; i++) {
    const bh = (h.counts[i] / max) * (height - 2);
    const x = i * bw;
    bars += `<rect x="${(x + gap).toFixed(2)}" y="${(height - bh).toFixed(2)}" width="${Math.max(0.5, bw - gap).toFixed(2)}" height="${bh.toFixed(2)}" rx="0.5" fill="${color}"><title>${fmtEdge(h.bins[i])} – ${fmtEdge(h.bins[i + 1])}: ${h.counts[i]}</title></rect>`;
  }
  return `<svg class="chart" viewBox="0 0 ${w} ${height}" preserveAspectRatio="none" height="${height}">${bars}</svg>`;
}
function barsHtml(top: { value: string; count: number }[], total: number, limit: number): string {
  const max = Math.max(...top.map((t) => t.count), 1);
  return top.slice(0, limit).map((t) => {
    const pct = (t.count / max) * 100;
    const share = total ? ((t.count / total) * 100).toFixed(1) : "0";
    const label = t.value === "" ? "(empty)" : t.value;
    return `<div class="bar-row" style="margin:3px 0">
      <div style="display:flex;justify-content:space-between;gap:8px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%" title="${esc(label)}">${esc(label)}</span>
        <span style="color:var(--muted);font-variant-numeric:tabular-nums">${abbr(t.count)} · ${share}%</span>
      </div>
      <div style="height:5px;background:var(--panel-2);border-radius:3px;margin-top:2px;overflow:hidden">
        <i style="display:block;height:100%;width:${pct}%;background:var(--bar);border-radius:3px"></i>
      </div>
    </div>`;
  }).join("");
}

// ---- state ----
let order: number[] = D.rows.map((_, i) => i); // indices into D.rows after filter/sort
let sortCol = -1; let sortDir: 1 | -1 = 1;
let query = "";
let activeCol = -1;

const colType = (i: number) => D.types[D.columns[i]];

// ---- durable, shareable view state (URL hash) ----
// The search query, sort column/direction, focused column and theme are mirrored
// into location.hash so a view can be bookmarked or shared: copy the address bar
// (works even for a double-clicked file://…#… artifact) and whoever opens the same
// file at that fragment lands on the exact same filtered/sorted view. Fully offline;
// the hash never causes a network request.
let hashTheme: "light" | "dark" | null = null;
let suppressHash = false; // guards the write-on-change / read-on-hashchange loop

function readHash(): void {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return;
  let p: URLSearchParams;
  try { p = new URLSearchParams(raw); } catch { return; }
  const q = p.get("q");
  query = q ?? "";
  const sc = p.get("sortcol");
  if (sc !== null) {
    const ci = D.columns.indexOf(sc);
    sortCol = ci;
    sortDir = p.get("sortdir") === "desc" ? -1 : 1;
  } else { sortCol = -1; sortDir = 1; }
  const col = p.get("col");
  activeCol = col !== null ? D.columns.indexOf(col) : -1;
  const th = p.get("theme");
  hashTheme = th === "dark" || th === "light" ? th : null;
}

function writeHash(): void {
  if (suppressHash) return;
  const p = new URLSearchParams();
  if (query.trim()) p.set("q", query);
  if (sortCol >= 0) { p.set("sortcol", D.columns[sortCol]); if (sortDir === -1) p.set("sortdir", "desc"); }
  if (activeCol >= 0) p.set("col", D.columns[activeCol]);
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) p.set("theme", theme);
  const frag = p.toString();
  const target = location.pathname + location.search + (frag ? "#" + frag : "#");
  try {
    history.replaceState(null, "", target);
  } catch {
    // file:// in some engines rejects replaceState with a URL; fall back to the
    // fragment assignment (guarded so the resulting hashchange is ignored).
    suppressHash = true;
    location.hash = frag;
    setTimeout(() => { suppressHash = false; }, 0);
  }
}

function applyFilterSort() {
  const q = query.trim().toLowerCase();
  let idx: number[];
  if (!q) {
    idx = D.rows.map((_, i) => i);
  } else {
    idx = [];
    for (let i = 0; i < D.rows.length; i++) {
      const row = D.rows[i];
      let hit = false;
      for (let c = 0; c < row.length; c++) {
        const v = row[c];
        if (v === null || v === undefined) continue;
        const s = isNum(colType(c)) ? String(v) : isDate(colType(c)) ? fmtDateVal(v, colType(c)) : String(v);
        if (s.toLowerCase().includes(q)) { hit = true; break; }
      }
      if (hit) idx.push(i);
    }
  }
  if (sortCol >= 0) {
    const t = colType(sortCol); const num = isNum(t) || isDate(t);
    idx.sort((a, b) => {
      const va = D.rows[a][sortCol]; const vb = D.rows[b][sortCol];
      if (va === null || va === undefined) return vb === null || vb === undefined ? 0 : 1;
      if (vb === null || vb === undefined) return -1;
      let cmp: number;
      if (num) cmp = (va as number) - (vb as number);
      else cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
      return cmp * sortDir;
    });
  }
  order = idx;
}

// ---- virtualized table ----
const ROW_H = 30;
let scrollEl: HTMLElement, spacer: HTMLElement, tbody: HTMLElement, theadRow: HTMLElement;

function renderHead() {
  theadRow.innerHTML =
    `<th class="rownum">#</th>` +
    D.columns.map((c, i) => {
      const t = D.types[c];
      const arrow = sortCol === i ? `<span class="arrow">${sortDir === 1 ? "▲" : "▼"}</span>` : "";
      return `<th data-c="${i}" title="${esc(c)} (${t})">${esc(c)}<span class="th-type">${t}</span>${arrow}</th>`;
    }).join("");
  theadRow.querySelectorAll("th[data-c]").forEach((th) => {
    th.addEventListener("click", () => {
      const c = +(th as HTMLElement).dataset.c!;
      if (sortCol === c) sortDir = sortDir === 1 ? -1 : 1; else { sortCol = c; sortDir = 1; }
      applyFilterSort(); renderHead(); renderRows(); setActive(c); writeHash();
    });
  });
}

function renderRows() {
  const total = order.length;
  spacer.style.height = total * ROW_H + "px";
  const scrollTop = scrollEl.scrollTop;
  const viewH = scrollEl.clientHeight;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - 8);
  const end = Math.min(total, Math.ceil((scrollTop + viewH) / ROW_H) + 8);
  let html = "";
  for (let r = start; r < end; r++) {
    const ri = order[r]; const row = D.rows[ri];
    let tds = `<td class="rownum">${ri + 1}</td>`;
    for (let c = 0; c < D.columns.length; c++) {
      const t = colType(c); const v = row[c];
      const nullish = v === null || v === undefined;
      const cls = nullish ? "null" : isNum(t) ? "num" : "";
      const txt = nullish ? "∅" : esc(fmtCell(v, t));
      tds += `<td class="${cls}">${txt}</td>`;
    }
    html += `<tr style="position:absolute;top:${r * ROW_H}px;height:${ROW_H}px;left:0;right:0;display:table;table-layout:fixed;width:100%">${tds}</tr>`;
  }
  tbody.innerHTML = html;
}

function setActive(i: number, sync = false) {
  activeCol = i;
  document.querySelectorAll(".col-card").forEach((el) => el.classList.toggle("active", +(el as HTMLElement).dataset.i! === i));
  renderDetail(i);
  refreshProv();
  if (sync) writeHash();
}

function renderSidebar() {
  const side = $("#sidebar");
  side.innerHTML = `<h2>${D.columns.length} columns</h2>` + D.stats.map((s, i) => {
    const nullPct = s.count + s.nulls ? (s.nulls / (s.count + s.nulls)) * 100 : 0;
    let mini = "";
    if (s.histogram) mini = `<div class="mini">${histSvg(s.histogram, 280, 34, "var(--bar)", s.type)}</div>`;
    else if (s.top) mini = `<div class="mini">${barsHtml(s.top, s.count, 3)}</div>`;
    return `<div class="col-card" data-i="${i}">
      <div class="col-head">
        <span class="col-name" title="${esc(s.name)}">${esc(s.name)}</span>
        <span class="type-badge ${s.type}">${s.type}</span>
      </div>
      <div class="col-sub">
        <span>${abbr(s.unique)}${s.uniqueApprox ? "+" : ""} unique</span>
        ${s.nulls ? `<span>${nullPct.toFixed(nullPct < 1 ? 1 : 0)}% null</span>` : `<span>no nulls</span>`}
      </div>
      <div class="nullbar"><i style="width:${nullPct}%"></i></div>
      ${mini}
    </div>`;
  }).join("");
  side.querySelectorAll(".col-card").forEach((el) => {
    el.addEventListener("click", () => setActive(+(el as HTMLElement).dataset.i!, true));
  });
}

function renderDetail(i: number) {
  const d = $("#detail");
  if (i < 0) { d.classList.remove("show"); return; }
  const s = D.stats[i];
  let g = "";
  const cell = (k: string, v: string) => `<span>${k} <b>${v}</b></span>`;
  g += cell("count", abbr(s.count));
  g += cell("nulls", abbr(s.nulls));
  g += cell("unique", abbr(s.unique) + (s.uniqueApprox ? "+" : ""));
  if (isNum(s.type)) {
    if (s.min !== undefined) g += cell("min", fmtNum(s.min));
    if (s.max !== undefined) g += cell("max", fmtNum(s.max));
    if (s.mean !== undefined) g += cell("mean", fmtNum(s.mean));
    if (s.median !== undefined) g += cell("median", fmtNum(s.median));
    if (s.std !== undefined) g += cell("std", fmtNum(s.std));
  } else if (isDate(s.type)) {
    if (s.minLabel) g += cell("min", s.minLabel);
    if (s.maxLabel) g += cell("max", s.maxLabel);
  }
  let chart = "";
  if (s.histogram) chart = `<div style="margin-top:10px;max-width:640px">${histSvg(s.histogram, 640, 80, "var(--bar)", s.type)}</div>`;
  else if (s.top) chart = `<div style="margin-top:10px;max-width:520px">${barsHtml(s.top, s.count, 12)}</div>`;
  d.innerHTML = `<div class="d-head"><span class="d-name">${esc(s.name)}</span><span class="type-badge ${s.type}">${s.type}</span></div>
    <div class="stat-grid">${g}</div>${chart}`;
  d.classList.add("show");
}

// ---- SQL panel ----
// A real SQL query engine embedded in the shareable file itself. The parser
// (src/sql.ts) compiles a SELECT into a plan run by the same read-only engine
// the CLI/MCP server use (src/mcp-query.ts). Zero network, zero eval.
let sqlOpen = false;
let objectRows: Row[] | null = null;

// D.rows is column-indexed arrays; the query engine wants name-keyed objects.
function rowsAsObjects(): Row[] {
  if (objectRows) return objectRows;
  const cols = D.columns;
  objectRows = D.rows.map((arr) => {
    const o: Row = {};
    for (let c = 0; c < cols.length; c++) o[cols[c]] = arr[c];
    return o;
  });
  return objectRows;
}

function toggleSql(force?: boolean) {
  sqlOpen = force === undefined ? !sqlOpen : force;
  const panel = $("#sql");
  panel.hidden = !sqlOpen;
  const btn = $("#sqlbtn");
  btn.classList.toggle("active", sqlOpen);
  if (sqlOpen) {
    if (provOpen) toggleProv(false);
    const ta = $("#sql-input") as HTMLTextAreaElement;
    ta.focus();
    if (!ta.value.trim()) ta.value = `SELECT * FROM data LIMIT 100`;
  }
}

function fmtResultCell(col: string, v: unknown): string {
  if (v === null || v === undefined) return `<span class="null">∅</span>`;
  const t = D.types[col];
  if (typeof v === "number" && (t === "date" || t === "datetime")) return esc(fmtDateVal(v, t));
  if (typeof v === "number") return esc(fmtNum(v));
  return esc(String(v));
}

function runSql() {
  const ta = $("#sql-input") as HTMLTextAreaElement;
  const msg = $("#sql-msg");
  const results = $("#sql-results");
  const sql = ta.value.trim();
  const compiled = parseSql(sql, D.columns);
  if (compiled.error || !compiled.spec) {
    msg.hidden = false;
    msg.className = "sql-msg err";
    msg.textContent = "✗ " + (compiled.error || "Could not parse query");
    results.hidden = true;
    return;
  }
  msg.hidden = true;
  const cap = 5000;
  let out: Row[];
  try {
    out = runQuery(rowsAsObjects(), compiled.spec, cap);
  } catch (e) {
    msg.hidden = false;
    msg.className = "sql-msg err";
    msg.textContent = "✗ " + (e instanceof Error ? e.message : String(e));
    results.hidden = true;
    return;
  }
  const cols = compiled.columns && compiled.columns.length ? compiled.columns : D.columns;
  const head = `<tr>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
  const body = out
    .map((r) => `<tr>${cols.map((c) => `<td>${fmtResultCell(c, (r as any)[c])}</td>`).join("")}</tr>`)
    .join("");
  $("#sql-restable").innerHTML = `<table class="sql-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  const capped = out.length >= cap;
  $("#sql-rescount").textContent =
    `${out.length.toLocaleString()} row${out.length === 1 ? "" : "s"}${capped ? ` (capped at ${cap.toLocaleString()})` : ""}`;
  results.hidden = false;
}

function init() {
  const fileName = D.source.split(/[\\/]/).pop() || D.source;
  const headline = D.title || fileName;
  document.title = `dataloupe · ${headline}`;
  const app = document.createElement("div");
  app.className = "app";
  const truncNote = D.truncated && D.totalRowCount
    ? `<span class="trunc-note">⚠ showing first ${D.rowCount.toLocaleString()} of ${D.totalRowCount.toLocaleString()} rows</span>` : "";
  // When a human title is set, keep the source filename visible as a secondary label.
  const sourceLabel = D.title ? `<span class="src-sub" title="source file">${esc(fileName)}</span>` : "";
  const noteBar = D.note
    ? `<div class="note-bar"><span class="note-ico">✎</span><span class="note-txt">${esc(D.note)}</span></div>` : "";
  app.innerHTML = `
    <header class="topbar">
      <span class="brand"><span class="logo">◉</span> dataloupe</span>
      <span class="meta">
        <span><b>${esc(headline)}</b></span>
        ${sourceLabel}
        <span><b>${D.rowCount.toLocaleString()}</b> rows</span>
        <span><b>${D.columns.length}</b> cols</span>
        <span>${D.format}</span>
        ${truncNote}
      </span>
      <span class="spacer"></span>
      <span class="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
        <input id="q" type="search" placeholder="Search all columns…" autocomplete="off">
      </span>
      <button class="iconbtn" id="sqlbtn" title="Run SQL against this data (offline)">▸_ SQL</button>
      <button class="iconbtn" id="about" title="About this file & current view">ⓘ about</button>
      <button class="iconbtn" id="theme">◐ theme</button>
    </header>
    ${noteBar}
    <div class="sql-panel" id="sql" hidden>
      <div class="sql-head">
        <span class="sql-title">SQL <span class="sql-sub">— runs 100% in your browser, no server</span></span>
        <button class="prov-close" id="sql-close" title="Close">✕</button>
      </div>
      <div class="sql-editor">
        <textarea id="sql-input" spellcheck="false" autocomplete="off" placeholder="SELECT * FROM data LIMIT 100"></textarea>
        <div class="sql-actions">
          <button class="sql-run" id="sql-run" title="Run (Ctrl/Cmd+Enter)">Run ▸</button>
          <span class="sql-hint">Ctrl/⌘+Enter</span>
        </div>
      </div>
      <div class="sql-grammar">
        <span class="sql-gram-label">Supported:</span>
        <code>SELECT</code> · <code>WHERE</code> (<code>AND</code>, <code>LIKE</code>, <code>IN</code>) ·
        <code>GROUP BY</code> · <code>COUNT/SUM/AVG/MIN/MAX</code> · <code>ORDER BY</code> ·
        <code>LIMIT</code>/<code>OFFSET</code> · aliases.
        <span class="sql-gram-note">Single table <code>data</code>; no joins or subqueries.</span>
      </div>
      <div class="sql-msg" id="sql-msg" hidden></div>
      <div class="sql-results" id="sql-results" hidden>
        <div class="sql-rescount" id="sql-rescount"></div>
        <div class="sql-restable" id="sql-restable"></div>
      </div>
    </div>
    <div class="prov-panel" id="prov" hidden>
      <div class="prov-head"><span>About this file</span><button class="prov-close" id="prov-close" title="Close">✕</button></div>
      <div class="prov-body" id="prov-body"></div>
    </div>
    <div class="body">
      <aside class="sidebar" id="sidebar"></aside>
      <main class="main">
        <div class="detail" id="detail"></div>
        <div class="table-wrap" id="scroll">
          <div id="spacer" style="position:relative;width:100%">
            <table style="position:absolute;top:0;left:0;width:100%">
              <thead><tr id="thead"></tr></thead>
              <tbody id="tbody"></tbody>
            </table>
          </div>
        </div>
        <div class="footer">
          <span id="count"></span>
          <span class="spacer" style="flex:1"></span>
          <span>generated offline by <a href="https://github.com/aurelio-nakamura/dataloupe" target="_blank" rel="noopener">dataloupe</a> · no data left your machine</span>
        </div>
      </main>
    </div>`;
  document.body.appendChild(app);

  scrollEl = $("#scroll"); spacer = $("#spacer"); tbody = $("#tbody"); theadRow = $("#thead");

  readHash(); // restore any bookmarked/shared view from location.hash

  renderSidebar();
  renderHead();
  applyFilterSort();
  renderRows();
  updateCount();

  scrollEl.addEventListener("scroll", () => renderRows(), { passive: true });
  window.addEventListener("resize", renderRows);

  const qEl = $("#q") as HTMLInputElement;
  qEl.value = query; // reflect a restored query into the search box
  let deb: any;
  qEl.addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(() => { query = qEl.value; applyFilterSort(); scrollEl.scrollTop = 0; renderRows(); updateCount(); writeHash(); }, 120);
  });
  $("#theme").addEventListener("click", toggleTheme);
  $("#about").addEventListener("click", () => toggleProv());
  $("#prov-close").addEventListener("click", () => toggleProv(false));
  $("#sqlbtn").addEventListener("click", () => toggleSql());
  $("#sql-close").addEventListener("click", () => toggleSql(false));
  $("#sql-run").addEventListener("click", () => runSql());
  ($("#sql-input") as HTMLTextAreaElement).addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); runSql(); }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && provOpen) toggleProv(false);
    if (e.key === "Escape" && sqlOpen) toggleSql(false);
  });
  applyInitialTheme();
  if (activeCol >= 0) setActive(activeCol); // reopen a restored column detail

  // React to back/forward or a manually edited fragment by re-applying the view.
  window.addEventListener("hashchange", () => {
    if (suppressHash) return;
    readHash();
    qEl.value = query;
    applyInitialTheme();
    applyFilterSort();
    renderHead();
    scrollEl.scrollTop = 0;
    renderRows();
    updateCount();
    setActive(activeCol);
  });
}

function updateCount() {
  $("#count").textContent = `${order.length.toLocaleString()} row${order.length === 1 ? "" : "s"}${query ? " matched" : ""}`;
  refreshProv();
}

// ---- provenance panel ----
// A collapsible panel so a recipient of a shared file can understand what they're
// looking at: where the data came from, when/how it was generated, any human note,
// and — live — the exact filter/sort/column view currently applied (which is also
// what the shareable link encodes). Everything here is already embedded in the file.
let provOpen = false;

function fmtGenerated(): string {
  const d = new Date(D.generatedAt);
  if (isNaN(d.getTime())) return D.generatedAt;
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

// Plain-English description of the active view; updates as filters/sorts change.
function viewSentence(): string {
  const parts: string[] = [];
  if (query.trim()) parts.push(`rows matching “<b>${esc(query.trim())}</b>”`);
  if (sortCol >= 0) parts.push(`sorted by <b>${esc(D.columns[sortCol])}</b> ${sortDir === 1 ? "ascending" : "descending"}`);
  if (activeCol >= 0) parts.push(`column <b>${esc(D.columns[activeCol])}</b> in focus`);
  if (!parts.length) return "All rows, unfiltered and unsorted.";
  let s = parts.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
  if (query.trim()) s += ` <b>${order.length.toLocaleString()}</b> of ${D.rowCount.toLocaleString()} rows match.`;
  return s;
}

function renderProvenance() {
  const b = $("#prov-body");
  if (!b) return;
  const rowsLine = D.truncated && D.totalRowCount
    ? `<b>${D.rowCount.toLocaleString()}</b> of ${D.totalRowCount.toLocaleString()} rows (truncated) · <b>${D.columns.length}</b> columns`
    : `<b>${D.rowCount.toLocaleString()}</b> rows · <b>${D.columns.length}</b> columns`;
  const row = (k: string, v: string) => `<div class="prov-row"><dt>${k}</dt><dd>${v}</dd></div>`;
  let html = "";
  if (D.title) html += row("Title", esc(D.title));
  if (D.note) html += row("Note", esc(D.note));
  html += row("Source", `${esc(D.source.split(/[\\/]/).pop() || D.source)} <span class="prov-dim">(${esc(D.format)})</span>`);
  html += row("Generated", `${fmtGenerated()} <span class="prov-dim">by dataloupe ${esc(D.version)}</span>`);
  html += row("Shape", rowsLine);
  const p = D.provenance;
  if (p) {
    if (p.sha256) {
      const size = p.sourceBytes != null ? ` <span class="prov-dim">(${fmtBytes(p.sourceBytes)})</span>` : "";
      html += row("Source SHA-256", `<code class="prov-hash" title="SHA-256 of the source data">${esc(p.sha256)}</code>${size}`);
    }
    if (p.steps && p.steps.length) {
      const items = p.steps.map((s) => `<li>${esc(s)}</li>`).join("");
      html += `<div class="prov-row prov-steps"><dt>How produced</dt><dd><ol class="prov-oplist">${items}</ol>${p.tool ? `<div class="prov-dim prov-tool">via ${esc(p.tool)}</div>` : ""}</dd></div>`;
    }
  }
  html += `<div class="prov-view"><dt>Current view</dt><dd>${viewSentence()}</dd></div>`;
  b.innerHTML =
    `<dl class="prov-dl">${html}</dl>` +
    `<div class="prov-actions"><button class="prov-copy" id="prov-copy">Copy link to this view</button><span class="prov-copied" id="prov-copied"></span></div>` +
    `<p class="prov-foot">Every field above travels inside this file. No data leaves your machine.</p>`;
  const copyBtn = document.getElementById("prov-copy");
  if (copyBtn) copyBtn.addEventListener("click", copyShareLink);
}

function copyShareLink() {
  const note = document.getElementById("prov-copied");
  const done = () => { if (note) { note.textContent = "Copied ✓"; setTimeout(() => { note.textContent = ""; }, 2000); } };
  const fail = () => { if (note) note.textContent = "Press ⌘/Ctrl-C"; };
  const url = location.href;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, () => fallbackCopy(url, done, fail));
    } else fallbackCopy(url, done, fail);
  } catch { fallbackCopy(url, done, fail); }
}

function fallbackCopy(text: string, done: () => void, fail: () => void) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    ok ? done() : fail();
  } catch { fail(); }
}

function refreshProv() { if (provOpen) renderProvenance(); }

function toggleProv(force?: boolean) {
  provOpen = force === undefined ? !provOpen : force;
  const panel = $("#prov");
  const btn = $("#about");
  if (panel) panel.hidden = !provOpen;
  if (btn) btn.classList.toggle("on", provOpen);
  if (provOpen) renderProvenance();
}
function applyInitialTheme() {
  // A theme pinned in the shared hash wins over the OS preference.
  const pref = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = hashTheme ?? (pref ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  hashTheme = next;
  writeHash();
}

init();
