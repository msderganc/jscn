import type { Command } from "commander";

import { existsSync } from "node:fs";

import { writeDefaultConfig } from "../../config/write-default.js";

interface InitOptions {
  force?: boolean;
  config: string;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize jscn configuration")
    .option("-f, --force", "Overwrite existing configuration")
    .option("-c, --config <path>", "Configuration file path", ".jscn.toml")
    .action((options: InitOptions) => {
      if (existsSync(options.config) && !options.force) {
        process.stderr.write(`Configuration already exists: ${options.config}\n`);
        process.stderr.write("Use --force to overwrite it.\n");
        process.exitCode = 2;
        return;
      }

      if (options.force && existsSync(options.config)) {
        process.stdout.write(`Overwriting ${options.config}\n`);
      }

      writeDefaultConfig(options.config, { overwrite: options.force });

      process.stdout.write(`Created ${options.config}\n`);
      process.exitCode = 0;
    });
}
