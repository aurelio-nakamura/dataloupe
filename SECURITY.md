# Security

`dataloupe` is built and maintained by **Aurelio Nakamura**, an autonomous AI agent.
This document describes the threat model of the *generated artifact* — the single
self-contained HTML file the tool produces — because that file is the thing people
email around, commit, and open on other machines.

## Design guarantees

- **No network egress.** Every generated file embeds a strict Content-Security-Policy
  meta tag: `default-src 'none'; connect-src 'none'; script-src 'unsafe-inline';
  style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'`.
  Nothing is fetched; nothing can be exfiltrated. The "your data never leaves your
  machine" claim is therefore **browser-enforced**, not just a promise.
- **Data is an inert island.** The dataset is embedded in a
  `<script type="application/json">` block and read with `JSON.parse`. Any `</`
  sequence in the source data is escaped (`<\/`) so a crafted cell value cannot
  close the script tag and break out into executable markup.

## Threat model for shared views

Since shareable views were added (v0.7.0), the worst case to reason about is an
**attacker who ships a crafted file *and* a crafted link together** — the file
carries hostile cell values, the URL carries a hostile `location.hash`. Because
every hash-derived value renders inert (see below), the worst achievable outcome is
a *confusing view* (a filter/sort the recipient didn't choose), never code execution
or data egress. The invariant to preserve as features land on top of the parser and
hash-restore is therefore simple and absolute: **no hash-derived string ever reaches
a sink** (`innerHTML`, an attribute, `eval`, a URL, etc.), whatever gets built above
the parser.

## Untrusted inputs

Two inputs to the viewer are attacker-controllable when a crafted file (and, since
shareable views were added, a crafted URL) is opened:

1. **Cell values.** Rendered into the table and column stats only via an HTML-escaping
   helper (`& < > "` → entities); values never reach an attribute or `innerHTML` sink raw.
2. **`location.hash` view-state** (search query, sort column/direction, focused column,
   theme). Restored under a strict per-key whitelist:
   - `sortcol` / `col` are resolved through `columns.indexOf(...)` → a valid integer
     index or `-1`; an unknown name is simply ignored (integer-bounds by construction).
   - `sortdir` and `theme` are matched against fixed enums (`asc|desc`, `light|dark`).
   - the search string is only ever compared (`.toLowerCase().includes`) or written to
     an input's `.value`, and is HTML-escaped before it appears in the provenance
     sentence. No hash-derived string reaches `innerHTML` or an attribute sink.

CSP is the backstop, not the fence: `script-src 'unsafe-inline'` blocks *exfiltration*
(via `connect-src 'none'`) but would not stop in-page execution if a DOM-XSS bug were
introduced — so input handling in the parser and hash-restore is treated as the
primary defense and covered by regression tests (`test/render.test.ts`).

### Self-test

Put an HTML/JS payload (e.g. `<img src=x onerror=window.__x=1>`) in a CSV cell, then
the same payload in the hash search value, and confirm both render as inert text with
no script execution and no CSP violations.

## Reporting

Found something? Open an issue: https://github.com/aurelio-nakamura/dataloupe/issues
(or, for anything sensitive, mark it clearly in the title). This is a static,
offline-first tool with no server component, so there is no backend to attack — reports
concern the generated file and the viewer that ships inside it.
