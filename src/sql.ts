/**
 * Tiny, dependency-free SQL-subset compiler.
 *
 * Turns a single-table SQL SELECT string into a {@link QuerySpec} that the
 * existing read-only query engine ({@link runQuery}) already knows how to
 * execute. No I/O, no eval, no mutation — pure string -> plan.
 *
 * Supported grammar (case-insensitive keywords):
 *
 *   SELECT  * | <col>[, ...] | <agg>[, ...]        (agg: COUNT/SUM/AVG/MIN/MAX)
 *   [FROM   <ident>]                               (ignored; single table)
 *   [WHERE  <cond> [AND <cond> ...]]               (=, !=/<>, >, >=, <, <=, LIKE, IN)
 *   [GROUP BY <col>[, ...]]
 *   [ORDER BY <col> [ASC|DESC]]
 *   [LIMIT  <n>]
 *   [OFFSET <n>]
 *
 * Anything outside this subset returns a helpful { error }.
 */
import type { QuerySpec, WhereClause, Agg, AggFn, Op } from "./mcp-query.js";

export interface SqlResult {
  spec?: QuerySpec;
  /** Column labels the result set will expose, in order (for rendering). */
  columns?: string[];
  error?: string;
}

type Tok = { t: string; v: string };

const KEYWORDS = new Set([
  "select", "from", "where", "group", "by", "order", "limit", "offset",
  "and", "as", "asc", "desc", "like", "in",
]);
const AGG_FNS = new Set(["count", "sum", "avg", "min", "max"]);

function tokenize(sql: string): Tok[] | { error: string } {
  const toks: Tok[] = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (/\s/.test(c)) { i++; continue; }
    // quoted string ' or "
    if (c === "'" || c === '"') {
      const q = c;
      let j = i + 1;
      let s = "";
      while (j < n) {
        if (sql[j] === q) {
          if (sql[j + 1] === q) { s += q; j += 2; continue; } // escaped quote
          break;
        }
        s += sql[j++];
      }
      if (j >= n) return { error: `Unterminated string starting at position ${i}` };
      toks.push({ t: "str", v: s });
      i = j + 1;
      continue;
    }
    // multi-char operators
    const two = sql.slice(i, i + 2);
    if (two === "!=" || two === "<>" || two === ">=" || two === "<=") {
      toks.push({ t: "op", v: two === "<>" ? "!=" : two });
      i += 2;
      continue;
    }
    if (c === "=" || c === ">" || c === "<") {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "," ) { toks.push({ t: ",", v: "," }); i++; continue; }
    if (c === "(") { toks.push({ t: "(", v: "(" }); i++; continue; }
    if (c === ")") { toks.push({ t: ")", v: ")" }); i++; continue; }
    if (c === "*") { toks.push({ t: "star", v: "*" }); i++; continue; }
    // number
    if (/[0-9]/.test(c) || (c === "-" && /[0-9]/.test(sql[i + 1] || ""))) {
      let j = i + 1;
      while (j < n && /[0-9._]/.test(sql[j])) j++;
      toks.push({ t: "num", v: sql.slice(i, j) });
      i = j;
      continue;
    }
    // identifier / keyword (allow backtick or [bracket] quoting for odd column names)
    if (c === "`" || c === "[") {
      const close = c === "`" ? "`" : "]";
      let j = i + 1;
      let s = "";
      while (j < n && sql[j] !== close) s += sql[j++];
      if (j >= n) return { error: `Unterminated quoted identifier at position ${i}` };
      toks.push({ t: "ident", v: s });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(sql[j])) j++;
      const w = sql.slice(i, j);
      const lw = w.toLowerCase();
      toks.push({ t: KEYWORDS.has(lw) ? "kw" : "ident", v: KEYWORDS.has(lw) ? lw : w });
      i = j;
      continue;
    }
    return { error: `Unexpected character '${c}' at position ${i}` };
  }
  return toks;
}

function coerce(raw: Tok): unknown {
  if (raw.t === "num") return Number(raw.v);
  if (raw.t === "str") return raw.v;
  // bareword: try boolean/null, else string
  const lv = raw.v.toLowerCase();
  if (lv === "null") return null;
  if (lv === "true") return true;
  if (lv === "false") return false;
  return raw.v;
}

/**
 * Compile a SQL string into a QuerySpec against a known column set.
 * `columns` enables validation + friendly errors; pass [] to skip validation.
 */
export function parseSql(sql: string, columns: string[] = []): SqlResult {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!trimmed) return { error: "Empty query" };
  const tk = tokenize(trimmed);
  if ("error" in tk) return { error: tk.error };
  const toks = tk;

  let p = 0;
  const peek = () => toks[p];
  const eat = () => toks[p++];
  const isKw = (w: string) => peek() && peek().t === "kw" && peek().v === w;
  const colSet = new Set(columns);
  const known = (c: string) => colSet.size === 0 || colSet.has(c);

  if (!isKw("select")) return { error: "Query must start with SELECT" };
  eat();

  const spec: QuerySpec = {};
  const selectCols: string[] = [];
  const aggs: Agg[] = [];
  const outCols: string[] = [];
  let selectStar = false;

  // ---- select list ----
  for (;;) {
    const t = peek();
    if (!t) return { error: "Unexpected end of query in SELECT list" };
    const isAggCall =
      t.t === "ident" &&
      AGG_FNS.has(t.v.toLowerCase()) &&
      toks[p + 1] &&
      toks[p + 1].t === "(";
    if (t.t === "star") {
      eat();
      selectStar = true;
    } else if (isAggCall) {
      const fn = t.v.toLowerCase() as AggFn;
      eat();
      if (!peek() || peek().t !== "(") return { error: `Expected '(' after ${fn.toUpperCase()}` };
      eat();
      let col: string | undefined;
      if (peek() && peek().t === "star") { eat(); }
      else if (peek() && peek().t === "ident") { col = eat().v; }
      else return { error: `Expected column or * inside ${fn.toUpperCase()}(...)` };
      if (!peek() || peek().t !== ")") return { error: `Expected ')' to close ${fn.toUpperCase()}(...)` };
      eat();
      if (col && !known(col)) return { error: `Unknown column '${col}'` };
      let alias: string | undefined;
      if (isKw("as")) { eat(); if (peek() && peek().t === "ident") alias = eat().v; else return { error: "Expected alias after AS" }; }
      const label = alias ?? `${fn}${col ? "_" + col : ""}`;
      aggs.push({ fn, column: col, as: label });
      outCols.push(label);
    } else if (t.t === "ident") {
      eat();
      if (!known(t.v)) return { error: `Unknown column '${t.v}'` };
      let alias: string | undefined;
      if (isKw("as")) { eat(); if (peek() && peek().t === "ident") alias = eat().v; else return { error: "Expected alias after AS" }; }
      selectCols.push(t.v);
      outCols.push(alias ?? t.v);
    } else {
      return { error: `Unexpected token '${t.v}' in SELECT list` };
    }
    if (peek() && peek().t === ",") { eat(); continue; }
    break;
  }

  // ---- optional FROM <ident> (ignored) ----
  if (isKw("from")) {
    eat();
    if (peek() && peek().t === "ident") eat();
    else return { error: "Expected table name after FROM" };
  }

  // ---- WHERE ----
  if (isKw("where")) {
    eat();
    const where: WhereClause[] = [];
    for (;;) {
      const colT = peek();
      if (!colT || colT.t !== "ident") return { error: "Expected column name in WHERE" };
      eat();
      if (!known(colT.v)) return { error: `Unknown column '${colT.v}'` };
      const opT = peek();
      if (!opT) return { error: `Expected operator after '${colT.v}'` };
      let op: Op;
      if (opT.t === "op") {
        eat();
        op = ({ "=": "eq", "!=": "ne", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" } as Record<string, Op>)[opT.v];
        const valT = peek();
        if (!valT || !["num", "str", "ident"].includes(valT.t)) return { error: `Expected value after '${opT.v}'` };
        eat();
        where.push({ column: colT.v, op, value: coerce(valT) });
      } else if (opT.t === "kw" && opT.v === "like") {
        eat();
        const valT = peek();
        if (!valT || valT.t !== "str") return { error: "LIKE expects a quoted pattern" };
        eat();
        where.push({ column: colT.v, op: "contains", value: String(valT.v).replace(/%/g, "") });
      } else if (opT.t === "kw" && opT.v === "in") {
        eat();
        if (!peek() || peek().t !== "(") return { error: "IN expects a parenthesized list" };
        eat();
        const vals: unknown[] = [];
        for (;;) {
          const vT = peek();
          if (!vT || !["num", "str", "ident"].includes(vT.t)) return { error: "Expected value inside IN (...)" };
          eat();
          vals.push(coerce(vT));
          if (peek() && peek().t === ",") { eat(); continue; }
          break;
        }
        if (!peek() || peek().t !== ")") return { error: "Expected ')' to close IN (...)" };
        eat();
        where.push({ column: colT.v, op: "in", value: vals });
      } else {
        return { error: `Unsupported operator '${opT.v}' in WHERE` };
      }
      if (isKw("and")) { eat(); continue; }
      break;
    }
    spec.where = where;
  }

  // ---- GROUP BY ----
  if (isKw("group")) {
    eat();
    if (!isKw("by")) return { error: "Expected BY after GROUP" };
    eat();
    const gb: string[] = [];
    for (;;) {
      const t = peek();
      if (!t || t.t !== "ident") return { error: "Expected column in GROUP BY" };
      eat();
      if (!known(t.v)) return { error: `Unknown column '${t.v}'` };
      gb.push(t.v);
      if (peek() && peek().t === ",") { eat(); continue; }
      break;
    }
    spec.group_by = gb;
  }

  // ---- ORDER BY ----
  if (isKw("order")) {
    eat();
    if (!isKw("by")) return { error: "Expected BY after ORDER" };
    eat();
    const t = peek();
    if (!t || t.t !== "ident") return { error: "Expected column in ORDER BY" };
    eat();
    // ORDER BY may reference an output alias (e.g. an aggregate label)
    if (!known(t.v) && !outCols.includes(t.v)) return { error: `Unknown column '${t.v}'` };
    let dir: "asc" | "desc" = "asc";
    if (isKw("asc")) eat();
    else if (isKw("desc")) { eat(); dir = "desc"; }
    spec.order_by = { column: t.v, dir };
  }

  // ---- LIMIT / OFFSET (either order) ----
  for (let guard = 0; guard < 2; guard++) {
    if (isKw("limit")) {
      eat();
      const t = peek();
      if (!t || t.t !== "num") return { error: "LIMIT expects a number" };
      eat();
      spec.limit = Math.max(0, Math.floor(Number(t.v)));
    } else if (isKw("offset")) {
      eat();
      const t = peek();
      if (!t || t.t !== "num") return { error: "OFFSET expects a number" };
      eat();
      spec.offset = Math.max(0, Math.floor(Number(t.v)));
    } else break;
  }

  if (peek()) return { error: `Unexpected trailing input near '${peek().v}'` };

  // ---- assemble ----
  const hasAgg = aggs.length > 0;
  if (hasAgg || (spec.group_by && spec.group_by.length)) {
    spec.aggregate = aggs.length ? aggs : [{ fn: "count", as: "count" }];
    // grouped result columns = group keys + agg labels
    const cols = [...(spec.group_by ?? []), ...spec.aggregate.map((a) => a.as ?? `${a.fn}${a.column ? "_" + a.column : ""}`)];
    // any bare selected columns must be part of GROUP BY
    for (const c of selectCols) {
      if (!(spec.group_by ?? []).includes(c)) {
        return { error: `Column '${c}' must appear in GROUP BY or an aggregate` };
      }
    }
    return { spec, columns: cols };
  }

  if (!selectStar && selectCols.length) {
    spec.select = selectCols;
    return { spec, columns: outCols };
  }
  // SELECT * (or nothing meaningful) → all columns
  return { spec, columns: columns.length ? columns : undefined };
}
