import { createInterface } from "node:readline/promises";

import { listTools, runTool } from "./tools.js";

export async function runMcpServer(input = process.stdin, output = process.stdout): Promise<void> {
  const rl = createInterface({ input });
  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }
    const request = JSON.parse(line) as {
      id?: unknown;
      method?: string;
      params?: { name: string; arguments?: { root: string; files?: string[]; configPath?: string } };
    };
    const result =
      request.method === "tools/list"
        ? { tools: listTools() }
        : request.method === "tools/call" && request.params
          ? { content: [{ type: "json", json: runTool(request.params.name, request.params.arguments as { root: string; files?: string[]; configPath?: string }) }] }
          : null;
    output.write(`${JSON.stringify({ jsonrpc: "2.0", id: request.id, result })}\n`);
  }
}
