import type { Dataset } from "./types.js";
import { VIEWER_CSS, VIEWER_JS } from "./generated/viewer-assets.js";

// Injected at build time from package.json via esbuild --define (see build:cli).
// Falls back for ts-node/vitest runs where the define isn't applied.
declare const __DATALOUPE_VERSION__: string | undefined;
export const VERSION =
  typeof __DATALOUPE_VERSION__ !== "undefined" ? __DATALOUPE_VERSION__ : "0.0.0-dev";

export interface RenderOptions {
  /** Human-authored title shown in the header and the browser tab. */
  title?: string;
  /** Human-authored note/provenance shown under the header. */
  note?: string;
}

/** Build the single self-contained HTML document for a dataset. */
export function renderHtml(ds: Dataset, opts: RenderOptions = {}): string {
  // Convert row objects -> arrays in column order (smaller payload, faster viewer).
  const rows = ds.rows.map((r) => ds.columns.map((c) => normalize(r[c])));

  const payload = {
    columns: ds.columns,
    types: ds.types,
    rows,
    stats: ds.stats,
    rowCount: ds.rowCount,
    totalRowCount: ds.totalRowCount,
    truncated: ds.truncated,
    source: ds.source,
    format: ds.format,
    generatedAt: new Date().toISOString(),
    version: VERSION,
    ...(opts.title ? { title: opts.title } : {}),
    ...(opts.note ? { note: opts.note } : {}),
  };

  // JSON embedded in a script tag: escape "</" so a value can't close the tag.
  const json = JSON.stringify(payload).replace(/<\//g, "<\\/");
  const title = escapeHtml(opts.title || basename(ds.source));

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="dataloupe ${VERSION}">
<title>dataloupe · ${title}</title>
<style>${VIEWER_CSS}</style>
</head>
<body>
<script id="dataloupe-data" type="application/json">${json}</script>
<script>window.__DATALOUPE__=JSON.parse(document.getElementById("dataloupe-data").textContent);</script>
<script>${VIEWER_JS}</script>
</body>
</html>
`;
}

function normalize(v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "bigint") return Number(v);
  return v;
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() || p;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}
