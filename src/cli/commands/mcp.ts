import type { Command } from "commander";

export function registerMcpCommand(program: Command): void {
  program
    .command("mcp")
    .description("Run the jscn MCP stdio server")
    .action(async () => {
      const { runMcpServer } = await import("../../mcp/server.js");
      await runMcpServer();
      process.exitCode = 0;
    });
}
