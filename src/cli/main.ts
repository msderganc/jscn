#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Command, CommanderError } from "commander";

import { version } from "../index.js";
import { registerAnalyzeCommand } from "./commands/analyze.js";
import { registerCheckCommand } from "./commands/check.js";
import { registerCompletionCommand } from "./commands/completion.js";
import { registerInitCommand } from "./commands/init.js";
import { registerMcpCommand } from "./commands/mcp.js";
import { registerVersionCommand } from "./commands/version.js";
import { UnsupportedCommandError } from "./errors.js";

export function main(argv: string[] = process.argv): number {
  const program = createProgram();

  try {
    program.parse(argv);
    return normalizeExitCode(process.exitCode);
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode;
    }

    if (error instanceof UnsupportedCommandError) {
      return normalizeExitCode(process.exitCode, 2);
    }

    throw error;
  }
}

export function createProgram(): Command {
  const program = new Command();
  program
    .name("jscn")
    .description("A JavaScript and TypeScript structural code quality analyzer")
    .version(version, "-V, --version", "Show version information")
    .exitOverride();

  registerAnalyzeCommand(program);
  registerCheckCommand(program);
  registerCompletionCommand(program);
  registerInitCommand(program);
  registerMcpCommand(program);
  registerVersionCommand(program);

  return program;
}

function isCliEntry(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (isCliEntry()) {
  process.exitCode = main(process.argv);
}

function normalizeExitCode(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : fallback;
  }

  return fallback;
}
