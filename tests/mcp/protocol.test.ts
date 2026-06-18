import { PassThrough } from "node:stream";

import { describe, expect, it } from "vitest";

import { runMcpServer } from "../../src/mcp/server.js";

describe("MCP protocol", () => {
  it("responds with protocol JSON on stdout-compatible output", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (chunk) => chunks.push(String(chunk)));

    const done = runMcpServer(input, output as NodeJS.WriteStream);
    input.end(`${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`);
    await done;

    expect(JSON.parse(chunks.join("")).result.tools.length).toBeGreaterThan(0);
  });
});
