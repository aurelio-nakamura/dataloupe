import { writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { buildDataset, buildDatasetFromText } from "./dataset.js";
import { renderHtml, VERSION } from "./render.js";
import { diffDatasets } from "./diff-core.js";
import { renderDiffHtml } from "./diff-render.js";
import type { Format } from "./parse.js";

interface Args {
  input?: string;
  output?: string;
  open: boolean;
  limit?: number;
  format?: Format;
  delimiter?: string;
  sheet?: string;
  title?: string;
  note?: string;
  help: boolean;
  version: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { open: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        a.help = true;
        break;
      case "-v":
      case "--version":
        a.version = true;
        break;
      case "-o":
      case "--output":
        a.output = argv[++i];
        break;
      case "--open":
        a.open = true;
        break;
      case "--limit":
        a.limit = Number(argv[++i]);
        break;
      case "--format":
        a.format = argv[++i] as Format;
        break;
      case "--delimiter":
        a.delimiter = argv[++i];
        break;
      case "--sheet":
        a.sheet = argv[++i];
        break;
      case "--title":
        a.title = argv[++i];
        break;
      case "--note":
        a.note = argv[++i];
        break;
      case "-":
        if (!a.input) a.input = "-";
        break;
      default:
        if (arg.startsWith("--output=")) a.output = arg.slice(9);
        else if (arg.startsWith("--limit=")) a.limit = Number(arg.slice(8));
        else if (arg.startsWith("--format=")) a.format = arg.slice(9) as Format;
        else if (arg.startsWith("--delimiter=")) a.delimiter = arg.slice(12);
        else if (arg.startsWith("--sheet=")) a.sheet = arg.slice(8);
        else if (arg.startsWith("--title=")) a.title = arg.slice(8);
        else if (arg.startsWith("--note=")) a.note = arg.slice(7);
        else if (!arg.startsWith("-") && !a.input) a.input = arg;
    }
  }
  return a;
}

const HELP = `dataloupe ${VERSION} — turn a data file into one self-contained, offline HTML explorer

USAGE
  dataloupe <file> [options]
  dataloupe diff <before> <after> [--key col]   (a git-diff for data files)
  dataloupe mcp                                 (MCP server for AI assistants, stdio)
  npx dataloupe data.csv --open

ARGUMENTS
  <file>                CSV, TSV, JSON, NDJSON/JSONL, Parquet, or Excel (.xlsx)
                       Use "-" or pipe to read from stdin (text formats only)

OPTIONS
  -o, --output <file>   output HTML path (default: <input>.html, or dataloupe.html for stdin)
      --open            open the result in your browser when done
      --limit <n>       load at most n rows (default: all)
      --format <fmt>    force format: csv|tsv|json|ndjson|parquet|xlsx
      --delimiter <d>   field delimiter for csv/tsv (default: auto)
      --sheet <name>    worksheet to read from an .xlsx file (default: first)
      --title <text>    human title shown in the header + browser tab
      --note <text>     provenance note shown under the header (why this export
                        exists, what upstream transform produced it, etc.)
  -h, --help            show this help
  -v, --version         print version

The output is a single .html file with no external requests: no CDN, no fonts,
no network, no telemetry. Your data never leaves your machine. Open it by
double-click, email it, or commit it to a repo.

Built and maintained by an AI agent (Aurelio Nakamura).`;

async function openInBrowser(file: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", file] : [file];
  try {
    spawn(cmd, args, { detached: true, stdio: "ignore" }).unref();
  } catch {
    /* best effort */
  }
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Guess a text format from piped content when the user gave no --format. */
function sniffTextFormat(text: string): Format {
  const t = text.replace(/^\uFEFF/, "").trimStart();
  if (t.startsWith("[") || t.startsWith("{")) {
    // A JSON array/object → json. Many lines each starting with `{` → ndjson.
    const firstLines = t.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (firstLines.length > 1 && firstLines.every((l) => l.trim().startsWith("{"))) {
      return "ndjson";
    }
    return "json";
  }
  if (text.includes("\t") && !text.split(/\r?\n/)[0].includes(",")) return "tsv";
  return "csv";
}

interface DiffArgs {
  before?: string;
  after?: string;
  output?: string;
  key?: string;
  open: boolean;
  json: boolean;
}

function parseDiffArgs(argv: string[]): DiffArgs {
  const a: DiffArgs = { open: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-o" || arg === "--output") a.output = argv[++i];
    else if (arg.startsWith("--output=")) a.output = arg.slice(9);
    else if (arg === "-k" || arg === "--key") a.key = argv[++i];
    else if (arg.startsWith("--key=")) a.key = arg.slice(6);
    else if (arg === "--open") a.open = true;
    else if (arg === "--json") a.json = true;
    else if (!arg.startsWith("-")) {
      if (!a.before) a.before = arg;
      else if (!a.after) a.after = arg;
    }
  }
  return a;
}

const DIFF_HELP = `dataloupe diff — a git-diff for data files, as one offline HTML report

USAGE
  dataloupe diff <before> <after> [options]
  npx dataloupe diff old.csv new.csv --key id --open

ARGUMENTS
  <before> <after>      two data files (CSV/TSV/JSON/NDJSON/Parquet/xlsx)

OPTIONS
  -k, --key <col[,col]> column(s) that identify a row → enables per-cell changes
                        (auto-detected from a unique id-like column when omitted)
  -o, --output <file>   output HTML path (default: <after>.diff.html)
      --json            print a machine-readable summary (counts) to stdout
      --open            open the result in your browser when done

Emits a single self-contained .html: added / removed / changed rows with the
exact cells that changed highlighted. No external requests; data never leaves
your machine. Built and maintained by an AI agent (Aurelio Nakamura).`;

async function runDiff(argv: string[]): Promise<void> {
  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(DIFF_HELP + "\n");
    return;
  }
  const a = parseDiffArgs(argv);
  if (!a.before || !a.after) {
    process.stderr.write("dataloupe diff: need two files: dataloupe diff <before> <after>\n");
    process.exit(1);
  }
  const before = resolve(a.before);
  const after = resolve(a.after);
  const ext = extname(after);
  const defaultOut = (ext ? after.slice(0, -ext.length) : after) + ".diff.html";
  const output = a.output ? resolve(a.output) : defaultOut;

  const t0 = Date.now();
  let bDs, aDs;
  try {
    [bDs, aDs] = await Promise.all([buildDataset(before), buildDataset(after)]);
  } catch (err) {
    process.stderr.write(`dataloupe diff: ${(err as Error).message}\n`);
    process.exit(1);
  }
  const key = a.key ? a.key.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const result = diffDatasets(bDs, aDs, { key });
  const html = renderDiffHtml(result);
  await writeFile(output, html, "utf8");

  const ms = Date.now() - t0;
  const size = Buffer.byteLength(html, "utf8");
  const c = result.counts;
  const keyNote = result.keyColumns.length
    ? `key: ${result.keyColumns.join(",")}${result.keyAuto ? " (auto)" : ""}`
    : "whole-row match (no key)";
  if (a.json) {
    // Machine-readable summary for CI/GitHub Action consumption.
    process.stdout.write(
      JSON.stringify({
        output,
        bytes: size,
        ms,
        keyColumns: result.keyColumns,
        keyAuto: result.keyAuto,
        counts: {
          added: c.added,
          removed: c.removed,
          changed: c.changed,
          unchanged: c.unchanged,
        },
        changed: c.added + c.removed + c.changed > 0,
      }) + "\n",
    );
  } else {
    process.stdout.write(
      `dataloupe diff → ${output}\n` +
        `  +${c.added} added · \u2212${c.removed} removed · ~${c.changed} changed · =${c.unchanged} unchanged\n` +
        `  ${keyNote} · ${fmtBytes(size)} · ${ms} ms\n`,
    );
  }
  if (a.open) await openInBrowser(output);
}

async function main() {
  if (process.argv[2] === "diff") {
    await runDiff(process.argv.slice(3));
    return;
  }
  if (process.argv[2] === "mcp") {
    // Launch the Model Context Protocol server (stdio) as a child process, with
    // stdio inherited so JSON-RPC passes straight through. Kept out of the main
    // CLI bundle so the common path never pays for the MCP SDK.
    const { spawn } = await import("node:child_process");
    const { fileURLToPath } = await import("node:url");
    const serverPath = fileURLToPath(new URL("./mcp.js", import.meta.url));
    const child = spawn(process.execPath, [serverPath, ...process.argv.slice(3)], {
      stdio: "inherit",
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }
  const args = parseArgs(process.argv.slice(2));
  if (args.version) {
    process.stdout.write(VERSION + "\n");
    return;
  }

  // An explicit --help always wins (even when output is piped to a pager).
  if (args.help) {
    process.stdout.write(HELP + "\n");
    return;
  }

  // Read from stdin when given "-", or when no input arg AND stdin is not a
  // TTY (i.e. data is being piped in).
  const useStdin = args.input === "-" || (!args.input && !process.stdin.isTTY);

  if (!useStdin && !args.input) {
    process.stdout.write(HELP + "\n");
    process.exit(1);
  }

  if (useStdin) {
    const text = await readStdin();
    if (text.trim() === "") {
      process.stderr.write("dataloupe: no data on stdin\n");
      process.exit(1);
    }
    const format = (args.format as Format) ?? sniffTextFormat(text);
    const output = args.output ? resolve(args.output) : resolve("dataloupe.html");
    const t0 = Date.now();
    let ds;
    try {
      ds = buildDatasetFromText(text, format, { limit: args.limit, delimiter: args.delimiter });
    } catch (err) {
      process.stderr.write(`dataloupe: failed to read stdin: ${(err as Error).message}\n`);
      process.exit(1);
    }
    const html = renderHtml(ds, { title: args.title, note: args.note });
    await writeFile(output, html, "utf8");
    const ms = Date.now() - t0;
    const size = Buffer.byteLength(html, "utf8");
    process.stdout.write(
      `dataloupe → ${output}\n` +
        `  ${ds.rowCount.toLocaleString()} rows × ${ds.columns.length} cols · ${ds.format} · ` +
        `${fmtBytes(size)} · ${ms} ms${ds.truncated ? " · (truncated)" : ""}\n`,
    );
    if (args.open) await openInBrowser(output);
    return;
  }

  const input = resolve(args.input!);
  const ext = extname(input);
  const defaultOut = (ext ? input.slice(0, -ext.length) : input) + ".html";
  const output = args.output ? resolve(args.output) : defaultOut;

  const t0 = Date.now();
  let ds;
  try {
    ds = await buildDataset(input, {
      format: args.format,
      limit: args.limit,
      delimiter: args.delimiter,
      sheet: args.sheet,
    });
  } catch (err) {
    process.stderr.write(`dataloupe: failed to read ${basename(input)}: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const html = renderHtml(ds, { title: args.title, note: args.note });
  await writeFile(output, html, "utf8");

  const ms = Date.now() - t0;
  const size = Buffer.byteLength(html, "utf8");
  process.stdout.write(
    `dataloupe → ${output}\n` +
      `  ${ds.rowCount.toLocaleString()} rows × ${ds.columns.length} cols · ${ds.format} · ` +
      `${fmtBytes(size)} · ${ms} ms${ds.truncated ? " · (truncated)" : ""}\n`,
  );

  if (args.open) await openInBrowser(output);
}

main().catch((err) => {
  process.stderr.write(`dataloupe: ${(err as Error).stack || err}\n`);
  process.exit(1);
});
