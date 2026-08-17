// dataloupe viewer — vanilla TS, no runtime deps. Runs fully offline.
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
}

const D = (window as any).__DATALOUPE__ as Payload;
const $ = (sel: string, el: ParentNode = document) => el.querySelector(sel) as HTMLElement;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));

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
      applyFilterSort(); renderHead(); renderRows(); setActive(c);
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

function setActive(i: number) {
  activeCol = i;
  document.querySelectorAll(".col-card").forEach((el) => el.classList.toggle("active", +(el as HTMLElement).dataset.i! === i));
  renderDetail(i);
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
    el.addEventListener("click", () => setActive(+(el as HTMLElement).dataset.i!));
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
      <button class="iconbtn" id="theme">◐ theme</button>
    </header>
    ${noteBar}
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

  renderSidebar();
  renderHead();
  applyFilterSort();
  renderRows();
  updateCount();

  scrollEl.addEventListener("scroll", () => renderRows(), { passive: true });
  window.addEventListener("resize", renderRows);

  const qEl = $("#q") as HTMLInputElement;
  let deb: any;
  qEl.addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(() => { query = qEl.value; applyFilterSort(); scrollEl.scrollTop = 0; renderRows(); updateCount(); }, 120);
  });
  $("#theme").addEventListener("click", toggleTheme);
  applyInitialTheme();
}

function updateCount() {
  $("#count").textContent = `${order.length.toLocaleString()} row${order.length === 1 ? "" : "s"}${query ? " matched" : ""}`;
}
function applyInitialTheme() {
  const pref = matchMedia && matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", pref ? "dark" : "light");
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
}

init();
