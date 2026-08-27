import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";

const SERVER = join(__dirname, "..", "dist", "mcp.js");

/** Minimal stdio JSON-RPC client for the built MCP server. */
function startClient() {
  const proc = spawn("node", [SERVER], { stdio: ["pipe", "pipe", "pipe"] });
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

      const vis = await c.call("visualize_data", { path: csv, out_path: html });
      expect(vis.result.content[0].text).toContain(html);
      expect(existsSync(html)).toBe(true);
    } finally {
      c.proc.kill();
    }
  }, 20000);
});
