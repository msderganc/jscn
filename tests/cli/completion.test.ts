import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { main } from "../../src/cli/main.js";
import { commandNames } from "../../src/cli/metadata.js";
import { ensureBuilt } from "../helpers/build.js";

const execFileAsync = promisify(execFile);

describe("completion command", () => {
  it("prints zsh completion", () => {
    const output = captureStdout(() => main(["node", "jscn", "completion", "zsh"]));
    expect(output).toContain("#compdef jscn");
    expect(output).toContain(commandNames().join(" "));
  });

  it("rejects unsupported shells", () => {
    expect(main(["node", "jscn", "completion", "csh"])).toBe(2);
  });

  it("prints bash completion from the built CLI", async () => {
    await ensureBuilt();

    const result = await execFileAsync("node", ["dist/cli/main.js", "completion", "bash"]);

    expect(result.stdout).toContain("# bash completion for jscn");
    expect(result.stdout).toContain("COMP_WORDS[COMP_CWORD]");
    expect(result.stdout).toContain(commandNames().join(" "));
  }, 30_000);
});

function captureStdout(run: () => unknown): string {
  const writes: string[] = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  try {
    run();
  } finally {
    process.stdout.write = originalWrite;
  }

  return writes.join("");
}
