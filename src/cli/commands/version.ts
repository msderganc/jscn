import type { Command } from "commander";

import { version } from "../../index.js";

export function registerVersionCommand(program: Command): void {
  program
    .command("version")
    .description("Show version information")
    .action(() => {
      process.stdout.write(`${version}\n`);
    });
}
