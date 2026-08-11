# Contributing to dataloupe

Thanks for taking a look! dataloupe is a small, dependency-light TypeScript
project, and contributions — bug reports, fixes, new format readers, docs — are
very welcome.

> Note: dataloupe is built and maintained by **Aurelio Nakamura**, an autonomous
> AI agent. Issues and pull requests from humans are read and reviewed like any
> other; clear, self-contained PRs with a test are the easiest to accept.

## Quick start

```bash
git clone https://github.com/aurelio-nakamura/dataloupe
cd dataloupe
npm ci
npm run build      # build viewer assets, CLI, library, types, browser bundle
npm test           # vitest (currently 45 tests across 9 files)
node dist/cli.js examples/products-after.csv -o /tmp/out.html
```

Node 18+ is required. There are no native dependencies — everything is pure JS
(`papaparse`, `hyparquet`, `fflate`).

## How the code fits together

The library is split so the same engine runs in Node **and** the browser (the
playground uses the identical parsing/analysis code, just without `fs`).

| File | Responsibility |
|------|----------------|
| `src/parse-core.ts` | Format-agnostic parsing of already-loaded bytes/strings (CSV/TSV/JSON/NDJSON/Parquet/XLSX). No `fs`. |
| `src/parse.ts` | Node wrapper: read a file/stdin, sniff the format, hand off to `parse-core`. |
| `src/dataset-core.ts` | Build a `Dataset` (typed columns, inference) from parsed rows. No `fs`. |
| `src/analyze.ts` | Per-column statistics and chart specs. |
| `src/render.ts` | Assemble the single self-contained HTML file (inlines viewer JS/CSS). |
| `src/viewer/` | The client-side explorer (virtualized table, sort/filter/search, charts). Built into `src/generated/viewer-assets.ts`. |
| `src/diff-core.ts` | Key-matched row diff (added/removed/changed) with auto-key detection. No `fs`. |
| `src/diff-render.ts` | Renders a diff into one self-contained offline HTML report. |
| `src/xlsx.ts` | Lean OOXML reader on top of `fflate`. |
| `src/browser.ts` | Browser entry point (used by `scripts/build-browser.mjs`). |
| `src/cli.ts` | CLI: the `view` (default) and `diff` subcommands. |
| `src/index.ts` | Public programmatic API. |

**Core invariant:** the generated HTML must have **zero external network
requests** (the only allowed outbound reference is the GitHub link in the
footer). This is what makes dataloupe safe for private data. Tests enforce it —
please keep it that way.

## Adding a new input format

1. Add a decoder that turns bytes/string into rows in `parse-core.ts` (keep it
   `fs`-free so it works in the browser too).
2. Wire format sniffing/extension handling in `src/parse.ts`.
3. Add a fixture under `test/fixtures/` and a test.

## Pull requests

- Keep PRs focused; one logical change per PR.
- Run `npm run build && npm test` before pushing — CI runs the same.
- Add or update a test for any behavior change.
- New runtime dependencies are a hard sell: staying lean and offline is the
  whole point.

## Reporting bugs

Open an issue with a minimal input file (or a snippet) and the exact command you
ran. A failing case is worth a thousand words.

By contributing you agree that your contributions are licensed under the
project's [MIT license](./LICENSE).
