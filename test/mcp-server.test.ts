import { spawn } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

const SERVER = join(__dirname, "..", "dist", "mcp.js");

/** Minimal stdio JSON-RPC client for the built MCP server. */
function startClient(env?: Record<string, string>) {
  const proc = spawn("node", [SERVER], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, ...env },
  });
  let buf = "";
  const pending = new Map<number, (m: any) => void>();
  proc.stdout.on("data", (d) => {
    buf += d.toString();
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.trim()) continue;
      const m = JSON.parse(line);
      if (m.id && pending.has(m.id)) {
        pending.get(m.id)!(m);
        pending.delete(m.id);
      }
    }
  });
  let id = 0;
  const rpc = (method: string, params?: unknown) => {
    id++;
    const my = id;
    return new Promise<any>((res) => {
      pending.set(my, res);
      proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id: my, method, params }) + "\n");
    });
  };
  const notify = (method: string, params?: unknown) =>
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  const call = (name: string, args: unknown) =>
    rpc("tools/call", { name, arguments: args });
  return { proc, rpc, notify, call };
}

describe("dataloupe MCP server (stdio)", () => {
  beforeAll(() => {
    if (!existsSync(SERVER)) throw new Error("run `npm run build:mcp` first");
  });

  it("handshakes, lists tools, and answers calls", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dataloupe-mcp-"));
    const csv = join(dir, "s.csv");
    writeFileSync(csv, "id,dept,salary\n1,Eng,120\n2,Eng,100\n3,Sales,90\n");
    const html = join(dir, "out.html");

    const c = startClient();
    try {
      const init = await c.rpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      expect(init.result.serverInfo.name).toBe("dataloupe");
      c.notify("notifications/initialized", {});

      const tools = await c.rpc("tools/list", {});
      const names = tools.result.tools.map((t: any) => t.name).sort();
      expect(names).toEqual(
        [
          "describe_data",
          "diff_data",
          "list_data_files",
          "preview_data",
          "query_data",
          "sql_query",
          "visualize_data",
        ].sort(),
      );

      const desc = await c.call("describe_data", { path: csv });
      expect(desc.result.content[0].text).toContain('"format": "csv"');

      const q = await c.call("query_data", {
        path: csv,
        group_by: ["dept"],
        aggregate: [{ fn: "avg", column: "salary", as: "avg" }],
      });
      expect(q.result.content[0].text).toContain("Eng");
      expect(q.result.content[0].text).toContain("110");

      const sql = await c.call("sql_query", {
        path: csv,
        sql: "SELECT dept, AVG(salary) AS avg FROM t GROUP BY dept ORDER BY avg DESC",
      });
      expect(sql.result.content[0].text).toContain("Eng");
      expect(sql.result.content[0].text).toContain("110");

      const sqlBad = await c.call("sql_query", { path: csv, sql: "DELETE FROM t" });
      expect(sqlBad.result.isError).toBe(true);
      expect(sqlBad.result.content[0].text.toLowerCase()).toContain("sql error");

      const vis = await c.call("visualize_data", { path: csv, out_path: html });
      expect(vis.result.content[0].text).toContain(html);
      expect(existsSync(html)).toBe(true);
    } finally {
      c.proc.kill();
    }
  }, 20000);

  it("confines to DATALOUPE_MCP_ROOT and blocks symlink escape", async () => {
    // secret/ lives OUTSIDE the root; a symlink inside the root points to it.
    const base = mkdtempSync(join(tmpdir(), "dataloupe-root-"));
    const root = join(base, "data");
    const secretDir = join(base, "secret");
    mkdirSync(root);
    mkdirSync(secretDir);
    const secret = join(secretDir, "secret.csv");
    writeFileSync(secret, "id,token\n1,hunter2\n");
    const inside = join(root, "ok.csv");
    writeFileSync(inside, "id,v\n1,a\n");
    // A symlink inside the root that resolves outside it.
    const escape = join(root, "escape.csv");
    symlinkSync(secret, escape);

    const c = startClient({ DATALOUPE_MCP_ROOT: root });
    try {
      await c.rpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      c.notify("notifications/initialized", {});

      // In-root file is fine.
      const good = await c.call("describe_data", { path: inside });
      expect(good.result.content[0].text).toContain('"format": "csv"');

      // Absolute path outside root is denied.
      const outAbs = await c.call("describe_data", { path: secret });
      const outText = JSON.stringify(outAbs.result);
      expect(outText).toMatch(/Access denied|outside the allowed root/);

      // Symlink inside root that points outside is denied (canonicalized).
      const outLink = await c.call("describe_data", { path: escape });
      const linkText = JSON.stringify(outLink.result);
      expect(linkText).toMatch(/Access denied|outside the allowed root/);
      expect(linkText).not.toContain("hunter2");
    } finally {
      c.proc.kill();
    }
  }, 20000);
  it("enforces the per-file size cap (DATALOUPE_MCP_MAX_BYTES)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dataloupe-cap-"));
    const csv = join(dir, "big.csv");
    // ~2 KiB of CSV, cap set to 100 bytes -> must be refused before loading.
    let body = "id,v\n";
    for (let i = 0; i < 200; i++) body += `${i},row-${i}\n`;
    writeFileSync(csv, body);

    const c = startClient({ DATALOUPE_MCP_MAX_BYTES: "100" });
    try {
      await c.rpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      c.notify("notifications/initialized", {});

      const res = await c.call("describe_data", { path: csv });
      const text = JSON.stringify(res.result);
      expect(text).toMatch(/File too large|exceeds the/);
      // No dataset content leaked through.
      expect(text).not.toContain('"format": "csv"');
    } finally {
      c.proc.kill();
    }
  }, 20000);

  it("read-only mode refuses caller-specified out_path but still returns an artifact", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dataloupe-ro-"));
    const csv = join(dir, "s.csv");
    writeFileSync(csv, "id,v\n1,a\n2,b\n");
    const target = join(dir, "should-not-be-written.html");

    const c = startClient({ DATALOUPE_MCP_READONLY: "1" });
    try {
      await c.rpc("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      c.notify("notifications/initialized", {});

      // Explicit out_path is denied and the named file is never created.
      const denied = await c.call("visualize_data", { path: csv, out_path: target });
      expect(JSON.stringify(denied.result)).toMatch(/Read-only mode/);
      expect(existsSync(target)).toBe(false);

      // Without out_path the artifact is still produced (in a temp file).
      const okRes = await c.call("visualize_data", { path: csv });
      const outText = okRes.result.content[0].text;
      expect(outText).toContain(".html");
      const m = outText.match(/(\/[^\s]+\.html)/);
      expect(m).toBeTruthy();
      expect(existsSync(m![1])).toBe(true);
    } finally {
      c.proc.kill();
    }
  }, 20000);
});
