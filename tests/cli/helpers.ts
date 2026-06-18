import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main } from "../../src/cli/main.js";

export function fixtureProject(): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-cli-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/clean.ts"), "export const clean = () => true;\n", "utf8");
  writeFileSync(
    join(root, "src/complex.ts"),
    [
      "export function complex(value: string): boolean {",
      '  if (value === "a") return true;',
      '  if (value === "b") return true;',
      '  if (value === "c") return true;',
      '  if (value === "d") return true;',
      "  return false;",
      "}",
      "",
    ].join("\n"),
    "utf8"
  );
  return root;
}

export function runCli(root: string, args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const previousCwd = process.cwd();
  const previousExitCode = process.exitCode;
  const stdoutWrite = process.stdout.write;
  const stderrWrite = process.stderr.write;
  const stdout: string[] = [];
  const stderr: string[] = [];

  process.chdir(root);
  process.exitCode = undefined;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    return {
      exitCode: main(["node", "jscn", ...args]),
      stdout: stdout.join(""),
      stderr: stderr.join(""),
    };
  } finally {
    process.chdir(previousCwd);
    process.exitCode = previousExitCode;
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
  }
}
