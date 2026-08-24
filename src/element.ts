/**
 * dataloupe — `<dataloupe-table>` embeddable web component.
 *
 * Drop an interactive, fully-offline data explorer into ANY web page — no
 * framework, no build step, no server. The component reuses the exact same
 * rendering engine as the CLI and produces a self-contained document that it
 * mounts inside a sandboxed `<iframe>` (unique origin, embedded
 * `default-src 'none'` CSP), so the data you point it at never leaves the
 * browser and can't touch the host page.
 *
 * Built and maintained by an AI agent (Aurelio Nakamura).
 *
 * @example Declarative — point it at a data file
 * ```html
 * <script type="module" src="dataloupe-element.js"></script>
 * <dataloupe-table src="sales.csv" height="600"></dataloupe-table>
 * ```
 *
 * @example Imperative — hand it in-memory rows
 * ```js
 * const el = document.querySelector("dataloupe-table");
 * el.rows = [{ name: "Ada", born: 1815 }, { name: "Alan", born: 1912 }];
 * ```
 *
 * @module
 */
import { datasetFromRows, buildDatasetFromText } from "./dataset-core.js";
import { detectFormat, type Format } from "./parse-core.js";
import { renderHtml } from "./render.js";
import { parseXlsxBytes } from "./xlsx.js";
import type { Row } from "./types.js";

/** Options accepted by {@link renderToHtml} and the `render()` method. */
export interface EmbedOptions {
  /** Row cap for very large inputs (default: unlimited). */
  limit?: number;
  /** Label shown in the viewer header / provenance. */
  source?: string;
  /** Explicit format; inferred from the filename/extension when omitted. */
  format?: Format;
  /** Human title shown in the viewer header + document title. */
  title?: string;
  /** Provenance note shown under the header. */
  note?: string;
}

/** True for formats that must be read as bytes (not text). */
function isBinary(format: Format): boolean {
  return format === "xlsx" || format === "parquet";
}

async function bytesToHtml(bytes: Uint8Array, format: Format, opts: EmbedOptions): Promise<string> {
  const source = opts.source ?? "(embedded)";
  if (format === "xlsx") {
    const { rows } = parseXlsxBytes(bytes, { limit: opts.limit });
    const ds = datasetFromRows(rows, { format: "xlsx", source, totalRowCount: rows.length });
    return renderHtml(ds, { title: opts.title, note: opts.note });
  }
  // parquet
  const { parquetReadObjects } = await import("hyparquet");
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const file = {
    byteLength: buffer.byteLength,
    slice: (start: number, end?: number) => buffer.slice(start, end ?? buffer.byteLength),
  };
  const rowEnd = opts.limit && Number.isFinite(opts.limit) ? opts.limit : undefined;
  const raw = (await parquetReadObjects({ file, rowEnd })) as Row[];
  const rows = raw.map((r) => {
    const out: Row = {};
    for (const [k, v] of Object.entries(r)) out[k] = typeof v === "bigint" ? Number(v) : v;
    return out;
  });
  const ds = datasetFromRows(rows, {
    format: "parquet",
    source,
    totalRowCount: rows.length,
    truncated: rowEnd !== undefined && rows.length >= rowEnd,
  });
  return renderHtml(ds, { title: opts.title, note: opts.note });
}

/**
 * Turn a fetched Response into a self-contained dataloupe HTML string.
 * Reads bytes for parquet/xlsx and text otherwise.
 */
export async function responseToHtml(
  res: Response,
  url: string,
  opts: EmbedOptions = {},
): Promise<string> {
  const format = opts.format ?? detectFormat(url);
  const source = opts.source ?? url;
  if (isBinary(format)) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytesToHtml(bytes, format, { ...opts, source });
  }
  const text = await res.text();
  const ds = buildDatasetFromText(text, format, { limit: opts.limit }, source);
  return renderHtml(ds, { title: opts.title, note: opts.note });
}

/** Render in-memory rows to a self-contained dataloupe HTML string. */
export function rowsToHtml(rows: Row[], opts: EmbedOptions = {}): string {
  const ds = datasetFromRows(rows, {
    format: "rows",
    source: opts.source ?? "(rows)",
    totalRowCount: rows.length,
  });
  return renderHtml(ds, { title: opts.title, note: opts.note });
}

/** Render a text string (csv/tsv/json/ndjson) to a self-contained HTML string. */
export function textToHtml(text: string, format: Format, opts: EmbedOptions = {}): string {
  const ds = buildDatasetFromText(text, format, { limit: opts.limit }, opts.source ?? "(text)");
  return renderHtml(ds, { title: opts.title, note: opts.note });
}

const OBSERVED = ["src", "height", "limit", "title", "format"] as const;

/**
 * `<dataloupe-table>` — a framework-free custom element that renders an
 * interactive dataloupe explorer inside a sandboxed iframe.
 *
 * Attributes: `src`, `format`, `limit`, `title`, `height`.
 * Properties: `rows` (Row[]), `text` + `format`, plus `render*` methods.
 * Events: `dataloupe:load` on success, `dataloupe:error` on failure.
 */
export class DataloupeTable extends HTMLElement {
  static get observedAttributes(): readonly string[] {
    return OBSERVED;
  }

  #iframe: HTMLIFrameElement;
  #root: ShadowRoot;
  #reqId = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent =
      ":host{display:block;position:relative}iframe{width:100%;height:100%;border:0;display:block}";
    this.#iframe = document.createElement("iframe");
    // allow-scripts (viewer JS) WITHOUT allow-same-origin => unique opaque
    // origin: the frame can't reach the host page's DOM/cookies/storage.
    this.#iframe.setAttribute("sandbox", "allow-scripts");
    this.#iframe.setAttribute("title", "dataloupe data explorer");
    this.#root.append(style, this.#iframe);
  }

  connectedCallback(): void {
    this.#applyHeight();
    if (this.getAttribute("src")) void this.#loadFromSrc();
  }

  attributeChangedCallback(name: string): void {
    if (name === "height") this.#applyHeight();
    else if (this.isConnected && this.getAttribute("src")) void this.#loadFromSrc();
  }

  #applyHeight(): void {
    const h = this.getAttribute("height");
    this.style.height = h ? (/^\d+$/.test(h) ? `${h}px` : h) : this.style.height || "480px";
  }

  #opts(): EmbedOptions {
    const limitAttr = this.getAttribute("limit");
    const limit = limitAttr ? Number(limitAttr) : undefined;
    const format = (this.getAttribute("format") as Format | null) ?? undefined;
    const title = this.getAttribute("title") ?? undefined;
    return { limit, format, title };
  }

  /** Mount an already-built HTML document string into the iframe. */
  setHtml(html: string): void {
    this.#iframe.srcdoc = html;
  }

  async #loadFromSrc(): Promise<void> {
    const url = this.getAttribute("src");
    if (!url) return;
    const id = ++this.#reqId;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`fetch ${url}: HTTP ${res.status}`);
      const html = await responseToHtml(res, url, this.#opts());
      if (id !== this.#reqId) return; // superseded by a newer request
      this.setHtml(html);
      this.dispatchEvent(new CustomEvent("dataloupe:load", { detail: { src: url } }));
    } catch (err) {
      if (id !== this.#reqId) return;
      this.dispatchEvent(
        new CustomEvent("dataloupe:error", { detail: { error: err }, bubbles: false }),
      );
      // eslint-disable-next-line no-console
      console.error("[dataloupe-table]", err);
    }
  }

  /** Set in-memory rows to display. */
  set rows(rows: Row[]) {
    this.setHtml(rowsToHtml(rows, this.#opts()));
    this.dispatchEvent(new CustomEvent("dataloupe:load", { detail: { rows: rows.length } }));
  }

  /** Provide raw text + a format to display. */
  setText(text: string, format: Format): void {
    this.setHtml(textToHtml(text, format, this.#opts()));
    this.dispatchEvent(new CustomEvent("dataloupe:load", { detail: { text: text.length } }));
  }
}

/**
 * Register the `<dataloupe-table>` element (idempotent). Called automatically
 * when this module is imported in a browser; safe to call again.
 */
export function defineDataloupeTable(tag = "dataloupe-table"): void {
  if (typeof customElements === "undefined") return;
  if (!customElements.get(tag)) customElements.define(tag, DataloupeTable);
}

defineDataloupeTable();
