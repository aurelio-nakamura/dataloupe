// Node-only helpers for building report provenance. Kept separate from render.ts
// (which is bundled for the browser) so `node:crypto`/`node:fs` never reach the
// browser build.
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import type { QuerySpec } from "./mcp-query.js";

/** Stream a file and return its SHA-256 (hex) and byte length. */
export async function hashFile(
  path: string,
): Promise<{ sha256: string; bytes: number }> {
  const hash = createHash("sha256");
  let bytes = 0;
  await new Promise<void>((resolve, reject) => {
    const s = createReadStream(path);
    s.on("data", (c: Buffer) => {
      bytes += c.length;
      hash.update(c);
    });
    s.on("end", () => resolve());
    s.on("error", reject);
  });
  return { sha256: hash.digest("hex"), bytes };
}

/** SHA-256 (hex) of an in-memory string (e.g. stdin content). */
export function hashString(text: string): { sha256: string; bytes: number } {
  const buf = Buffer.from(text, "utf8");
  return { sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.length };
}

/**
 * Describe a structured query as an ordered list of human-readable steps, so the
 * exact transformation that produced a report is embedded in the report itself.
 */
export function describeQuery(q: QuerySpec): string[] {
  const steps: string[] = [];
  if (q.where && q.where.length) {
    const conds = q.where
      .map((w) => `${w.column} ${w.op} ${JSON.stringify(w.value)}`)
      .join(" AND ");
    steps.push(`Filter: ${conds}`);
  }
  if (q.group_by && q.group_by.length) {
    const aggs = (q.aggregate ?? [])
      .map((a) => `${a.fn}(${a.column ?? "*"})${a.as ? ` as ${a.as}` : ""}`)
      .join(", ");
    steps.push(`Group by ${q.group_by.join(", ")}${aggs ? ` — ${aggs}` : ""}`);
  }
  if (q.select && q.select.length) {
    steps.push(`Select columns: ${q.select.join(", ")}`);
  }
  if (q.order_by) {
    steps.push(`Order by ${q.order_by.column} ${q.order_by.dir ?? "asc"}`);
  }
  if (typeof q.limit === "number") {
    steps.push(`Limit ${q.limit}${q.offset ? ` offset ${q.offset}` : ""}`);
  }
  return steps;
}
