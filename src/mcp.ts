/**
 * dataloupe MCP server (stdio).
 *
 * Gives an MCP-compatible AI assistant (Claude Desktop, Cursor, VS Code, ...)
 * read-only, fully-offline access to local tabular data files
 * (CSV/TSV/JSON/NDJSON/Parquet/Excel). Nothing is uploaded anywhere.
 *
 * The stand-out tool is `visualize_data`: it turns a file (or a query result)
 * into ONE self-contained, offline, interactive HTML explorer on disk and
 * returns its path — so the agent can hand the user a shareable artifact,
 * not just a text table.
 */
import { promises as fs, realpathSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  buildDataset,
  datasetFromRows,
  renderHtml,
  diffDatasets,
  renderDiffHtml,
  VERSION,
} from "./index.js";
import type { Row, ColumnStats } from "./types.js";
import { runQuery, toMarkdown, type QuerySpec } from "./mcp-query.js";

const SUPPORTED = new Set([
  ".csv",
  ".tsv",
  ".txt",
  ".json",
  ".ndjson",
  ".jsonl",
  ".parquet",
  ".xlsx",
]);

function extOf(p: string): string {
  const b = path.basename(p);
  const dot = b.lastIndexOf(".");
  return dot > 0 ? b.slice(dot).toLowerCase() : "";
}

/**
 * Canonicalize a path by resolving symlinks on its longest existing prefix,
 * then re-appending the not-yet-existing tail (e.g. a to-be-written out_path).
 * This defeats symlink-escape: a symlink living inside ROOT that points outside
 * ROOT would pass a naive string-prefix check, but its realpath does not.
 */
function canonicalize(p: string): string {
  let cur = path.resolve(p);
  const tail: string[] = [];
  // Walk up until we find an existing ancestor we can realpath().
  for (;;) {
    try {
      const real = realpathSync(cur);
      return tail.length ? path.join(real, ...tail.reverse()) : real;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return path.resolve(p); // nothing existed; give up
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
}

/**
 * Optional allow-list root. If set, all file access is confined to it.
 * Canonicalized once so the confinement check compares real paths.
 */
const ROOT = process.env.DATALOUPE_MCP_ROOT
  ? canonicalize(process.env.DATALOUPE_MCP_ROOT)
  : null;

function resolveSafe(p: string): string {
  const abs = canonicalize(p);
  if (ROOT && !(abs === ROOT || abs.startsWith(ROOT + path.sep))) {
    throw new Error(
      `Access denied: '${abs}' is outside the allowed root '${ROOT}'.`,
    );
  }
  return abs;
}

// ----------------------------------------------------------------------------
// helpers
// ----------------------------------------------------------------------------
function ok(text: string) {
  return { content: [{ type: "text" as const, text }] };
}
function fail(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

function statSummary(s: ColumnStats): Record<string, unknown> {
  const out: Record<string, unknown> = {
    name: s.name,
    type: s.type,
    nonNull: s.count,
    nulls: s.nulls,
    unique: s.uniqueApprox ? `~${s.unique}` : s.unique,
  };
  if (s.min !== undefined) out.min = s.minLabel ?? s.min;
  if (s.max !== undefined) out.max = s.maxLabel ?? s.max;
  if (s.mean !== undefined) out.mean = round(s.mean);
  if (s.median !== undefined) out.median = round(s.median);
  if (s.top && s.top.length)
    out.top = s.top.slice(0, 5).map((t) => `${t.value} (${t.count})`);
  return out;
}
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

async function outPath(explicit: string | undefined, hint: string): Promise<string> {
  if (explicit) return resolveSafe(explicit);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "dataloupe-"));
  return path.join(dir, hint);
}

// ----------------------------------------------------------------------------
// server
// ----------------------------------------------------------------------------
const server = new McpServer({ name: "dataloupe", version: VERSION });

const whereSchema = z.object({
  column: z.string(),
  op: z.enum(["eq", "ne", "gt", "gte", "lt", "lte", "contains", "in"]),
  value: z.any(),
});
const aggSchema = z.object({
  fn: z.enum(["count", "sum", "avg", "min", "max"]),
  column: z.string().optional(),
  as: z.string().optional(),
});
const queryShape = {
  select: z.array(z.string()).optional().describe("Columns to keep in the output."),
  where: z
    .array(whereSchema)
    .optional()
    .describe("Row filters (ANDed together)."),
  order_by: z
    .object({ column: z.string(), dir: z.enum(["asc", "desc"]).optional() })
    .optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  group_by: z.array(z.string()).optional().describe("Group rows by these columns."),
  aggregate: z
    .array(aggSchema)
    .optional()
    .describe("Aggregations to compute per group (with group_by)."),
};

server.registerTool(
  "list_data_files",
  {
    title: "List local data files",
    description:
      "List tabular data files (CSV/TSV/JSON/NDJSON/Parquet/Excel) in a local directory, with sizes.",
    inputSchema: {
      dir: z.string().describe("Directory to scan."),
      recursive: z.boolean().optional().describe("Recurse into subdirectories."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ dir, recursive }) => {
    try {
      const root = resolveSafe(dir);
      const found: { path: string; bytes: number }[] = [];
      async function walk(d: string) {
        const entries = await fs.readdir(d, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(d, e.name);
          if (e.isDirectory()) {
            if (recursive && !e.name.startsWith(".")) await walk(full);
          } else if (SUPPORTED.has(extOf(e.name))) {
            const st = await fs.stat(full);
            found.push({ path: full, bytes: st.size });
          }
        }
      }
      await walk(root);
      found.sort((a, b) => a.path.localeCompare(b.path));
      if (!found.length) return ok(`No supported data files found in ${root}.`);
      return ok(
        found
          .map((f) => `${f.path}\t${(f.bytes / 1024).toFixed(1)} KiB`)
          .join("\n"),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "describe_data",
  {
    title: "Describe a data file",
    description:
      "Return the schema, row/column counts, and per-column statistics (type, nulls, unique, min/max/mean/median, top values) for a local data file. Token-efficient; reads a sample for very large files.",
    inputSchema: {
      path: z.string().describe("Path to the data file."),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Max rows to sample when profiling (default: all/auto)."),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ path: p, limit }) => {
    try {
      const abs = resolveSafe(p);
      const ds = await buildDataset(abs, limit ? { limit } : {});
      const summary = {
        source: ds.source,
        format: ds.format,
        rowsLoaded: ds.rowCount,
        totalRows: ds.totalRowCount ?? ds.rowCount,
        truncated: ds.truncated,
        columns: ds.columns.length,
        schema: ds.stats.map(statSummary),
      };
      return ok(JSON.stringify(summary, null, 2));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "preview_data",
  {
    title: "Preview rows",
    description:
      "Return the first N rows of a local data file as a Markdown table.",
    inputSchema: {
      path: z.string().describe("Path to the data file."),
      limit: z.number().int().positive().optional().describe("Rows to show (default 20)."),
      offset: z.number().int().nonnegative().optional(),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ path: p, limit, offset }) => {
    try {
      const abs = resolveSafe(p);
      const n = limit ?? 20;
      const ds = await buildDataset(abs, { limit: (offset ?? 0) + n });
      const rows = ds.rows.slice(offset ?? 0, (offset ?? 0) + n);
      return ok(
        `**${abs}** — ${ds.totalRowCount ?? ds.rowCount} rows × ${ds.columns.length} cols\n\n` +
          toMarkdown(rows, ds.columns, ds.types),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "query_data",
  {
    title: "Query a data file",
    description:
      "Run a read-only structured query over a local data file: filter (where), select columns, order_by, limit/offset, and group_by with aggregations (count/sum/avg/min/max). Returns a Markdown table. No SQL, no writes — the file is never modified.",
    inputSchema: {
      path: z.string().describe("Path to the data file."),
      ...queryShape,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  async ({ path: p, ...q }) => {
    try {
      const abs = resolveSafe(p);
      const ds = await buildDataset(abs);
      const rows = runQuery(ds.rows, q as QuerySpec);
      const cols = rows.length ? Object.keys(rows[0]) : ds.columns;
      return ok(`${rows.length} row(s)\n\n` + toMarkdown(rows, cols, ds.types));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "visualize_data",
  {
    title: "Visualize as an offline interactive HTML explorer",
    description:
      "Turn a local data file (optionally after a query) into ONE self-contained, fully-offline, interactive HTML explorer file on disk (sortable/filterable table + column stats + charts). Returns the path. The user can open it in any browser; data never leaves the machine and the file has zero external requests. Use this to hand the user a shareable, explorable artifact instead of a plain text table.",
    inputSchema: {
      path: z.string().describe("Path to the data file."),
      out_path: z
        .string()
        .optional()
        .describe("Where to write the .html (default: a temp file)."),
      title: z.string().optional().describe("Title shown in the explorer."),
      ...queryShape,
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  async ({ path: p, out_path, title, ...q }) => {
    try {
      const abs = resolveSafe(p);
      const hasQuery =
        (q.where && q.where.length) ||
        q.group_by ||
        q.select ||
        q.order_by ||
        q.limit;
      let html: string;
      let shape: string;
      if (hasQuery) {
        const ds = await buildDataset(abs);
        const rows = runQuery(ds.rows, q as QuerySpec);
        html = renderHtml(
          datasetFromRows(rows, {
            source: title ?? path.basename(abs),
            format: ds.format,
          }),
        );
        shape = `${rows.length} rows (query result)`;
      } else {
        const ds = await buildDataset(abs);
        html = renderHtml(
          title ? { ...ds, source: title } : ds,
        );
        shape = `${ds.totalRowCount ?? ds.rowCount} rows × ${ds.columns.length} cols`;
      }
      const dest = await outPath(out_path, "explorer.html");
      await fs.writeFile(dest, html, "utf8");
      const bytes = Buffer.byteLength(html);
      return ok(
        `Wrote interactive explorer (${(bytes / 1024).toFixed(1)} KiB, ${shape}, fully offline) to:\n${dest}\n\nOpen it in any browser — no server, no network.`,
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "diff_data",
  {
    title: "Diff two data files",
    description:
      "Compare two local data files (a git-style diff for data). Reports added/removed/changed/unchanged row counts (matched by --key when given), and optionally writes a self-contained offline HTML diff report. Both files stay local.",
    inputSchema: {
      before: z.string().describe("Path to the OLD file."),
      after: z.string().describe("Path to the NEW file."),
      key: z
        .array(z.string())
        .optional()
        .describe("Column(s) that uniquely identify a row (enables cell-level changes)."),
      out_path: z
        .string()
        .optional()
        .describe("If set, write an offline HTML diff report here and return its path."),
    },
    annotations: { readOnlyHint: false, openWorldHint: false },
  },
  async ({ before, after, key, out_path }) => {
    try {
      const b = await buildDataset(resolveSafe(before));
      const a = await buildDataset(resolveSafe(after));
      const result = diffDatasets(b, a, key && key.length ? { key } : {});
      let extra = "";
      if (out_path) {
        const html = renderDiffHtml(result);
        const dest = resolveSafe(out_path);
        await fs.writeFile(dest, html, "utf8");
        extra = `\n\nWrote offline HTML diff report to:\n${dest}`;
      }
      const c = result.counts;
      return ok(
        JSON.stringify(
          {
            before: result.before,
            after: result.after,
            keyColumns: result.keyColumns,
            keyAuto: result.keyAuto,
            counts: c,
          },
          null,
          2,
        ) + extra,
      );
    } catch (e) {
      return fail(e);
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // eslint-disable-next-line no-console
  console.error(`dataloupe MCP server v${VERSION} ready (stdio).`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Fatal:", e);
  process.exit(1);
});
