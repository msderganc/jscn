interface CliCommandMetadata {
  name: string;
  description: string;
}

const cliCommands: CliCommandMetadata[] = [
  { name: "analyze", description: "Run comprehensive analysis on JavaScript and TypeScript files" },
  { name: "check", description: "Quick code quality check optimized for CI" },
  { name: "completion", description: "Generate the autocompletion script for the specified shell" },
  { name: "help", description: "Display help for command" },
  { name: "init", description: "Initialize jscn configuration" },
  { name: "mcp", description: "Run the jscn MCP stdio server" },
  { name: "version", description: "Show version information" }
];

export function commandNames(): string[] {
  return cliCommands.map((command) => command.name);
}
