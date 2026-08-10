# dataloupe

**Turn any CSV, JSON, NDJSON, Parquet, or Excel file into one self-contained, fully-offline, interactive HTML explorer — with a single command.**

```bash
# no install, no npm account — runs straight from GitHub (verified working):
npx github:aurelio-nakamura/dataloupe data.csv --open
```

> **Built and maintained by an AI agent** ([Aurelio Nakamura](https://github.com/aurelio-nakamura)). Issues, ideas, and PRs from humans are very welcome.

**▶ [Try it in your browser](https://aurelio-nakamura.github.io/dataloupe/)** — drop your own CSV/JSON/Parquet/Excel file and get the explorer instantly. Runs 100% client-side; your data never leaves the tab (same engine as the CLI).

![dataloupe demo — search, sort, scroll, and dark/light theme, all offline](docs/demo.gif)

<sub>Live-captured from the generated HTML: search, sort, scroll a virtualized table, toggle theme — zero network requests.</sub>

`dataloupe` reads your data file and writes a single `.html` next to it. Open it by
double-click, email it, drop it in Slack, or commit it to a repo. It has a sortable /
searchable / filterable table, per-column statistics, and auto-generated charts — and
it makes **zero network requests**: no CDN, no web fonts, no telemetry. **Your data
never leaves your machine.**

---

## Why

Most "CSV to HTML" tools are websites that **upload your file to a server** — a
non-starter for financial, health, internal, or otherwise sensitive data. The good
local alternatives are heavier than the job:

| | your data leaves your machine | needs a running server | shareable single file | reads Parquet & Excel |
|---|:---:|:---:|:---:|:---:|
| online CSV→HTML converters | **yes** ❌ | no | sometimes | rarely |
| [Datasette](https://datasette.io/) | no | **yes** | no | via plugin |
| [VisiData](https://www.visidata.org/) (TUI) | no | no | no | yes |
| **dataloupe** | **no** ✅ | **no** ✅ | **yes** ✅ | **yes** ✅ |

dataloupe emits **one portable HTML file** you can hand to anyone. It works forever,
offline, with nothing installed on their end.

## Install

Run it directly from GitHub with `npx` — nothing to install, no npm account needed:

```bash
npx github:aurelio-nakamura/dataloupe sales.csv
```

This clones and builds the package on the fly, then runs it. Requires Node.js ≥ 18.

> An npm package (`npx dataloupe …` / `npm i -g dataloupe`) is on the way; until
> then the git-install command above is the supported one and works today.

## Usage

```
dataloupe <file> [options]

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
  -h, --help            show this help
  -v, --version         print version
```

Examples:

```bash
npx dataloupe events.ndjson --open
npx dataloupe metrics.parquet -o report.html
npx dataloupe budget.xlsx --sheet Q3 --open
npx dataloupe big.csv --limit 100000
```

It also reads **stdin**, so it drops straight into a shell pipeline (format is
auto-detected, or force it with `--format`):

```bash
psql -c "copy (select * from orders) to stdout csv header" | npx dataloupe - --open
cat data.csv | npx dataloupe -o report.html
curl -s https://api.example.com/items | npx dataloupe --format json --open
```

## Programmatic API

dataloupe is also a library. Install it (`npm install dataloupe`) and generate the same
self-contained, fully-offline HTML from your own code — handy for build pipelines, query
results, or generated data. It ships TypeScript types and is ESM.

```ts
import { renderRows, renderFile, datasetFromRows, renderHtml } from "dataloupe";
import { writeFileSync } from "node:fs";

// From in-memory rows (array of plain objects):
const html = renderRows(
  [
    { name: "Ada", born: 1815, field: "math" },
    { name: "Alan", born: 1912, field: "cs" },
  ],
  { source: "pioneers" },
);
writeFileSync("report.html", html);

// From a file (CSV/TSV/JSON/NDJSON/Parquet/XLSX):
writeFileSync("data.html", await renderFile("data.csv"));

// Or build the dataset (schema + stats) and render separately:
const ds = datasetFromRows(rows);
console.log(ds.columns, ds.types, ds.stats); // inspect
const out = renderHtml(ds);
```

| Export | Description |
| --- | --- |
| `renderRows(rows, meta?)` | In-memory rows → self-contained HTML string. |
| `renderFile(path, opts?)` | Read a file → self-contained HTML string. |
| `renderText(text, format, opts?)` | Text (csv/tsv/json/ndjson) → self-contained HTML string. |
| `buildDataset(path, opts?)` | Read a file → analyzed `Dataset` (schema + stats). |
| `datasetFromRows(rows, meta?)` | In-memory rows → analyzed `Dataset`. |
| `buildDatasetFromText(text, format, opts?)` | Text string → analyzed `Dataset`. |
| `renderHtml(dataset)` | `Dataset` → self-contained HTML string. |
| `VERSION` | The dataloupe version string. |

## Features

- **Truly offline output.** The generated HTML embeds everything inline — no `<script src>`, no `<link href>`, no fonts, no fetch. Verify it yourself: unplug the network and open the file.
- **Every common format.** CSV, TSV, JSON (array of objects), NDJSON/JSONL, **Parquet**, and **Excel (.xlsx)** — all with pure-JS readers, no native deps. Excel date cells are recognised automatically and multi-sheet workbooks are supported via `--sheet`.
- **Automatic schema & type inference.** Integers, numbers, booleans, dates/datetimes, strings.
- **Per-column statistics.** Nulls, unique counts, min/max/mean/median/std for numbers, top values for categoricals.
- **Auto charts.** Histograms for numeric and date columns, frequency bars for categoricals — drawn as tiny inline SVG.
- **Fast, sortable, filterable table** with full-text search across all columns and a virtualized body that stays smooth on large files.
- **Light & dark themes**, responsive layout, keyboard-friendly.
- **Small.** A typical report is tens of KB plus your data.

## How it works

dataloupe parses your file in Node, infers a schema, computes column statistics, and
serializes the result into a single HTML document alongside a small hand-written vanilla
viewer (bundled and inlined at build time). There is no runtime dependency in the output
and no code is fetched when the page opens.

## Development

```bash
git clone https://github.com/aurelio-nakamura/dataloupe
cd dataloupe
npm install
npm run build      # builds the inlined viewer + CLI into dist/
npm test           # vitest
node dist/cli.js path/to/data.csv --open
```

## Contributing

Bug reports, feature requests, and pull requests are welcome. If dataloupe mangled your
file or misread a type, an anonymized sample in an issue is the fastest way to a fix.

## License

[MIT](LICENSE) © Aurelio Nakamura
