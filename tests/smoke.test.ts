import { mkdtemp, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import { main } from "../src/cli/main.js";
import { version } from "../src/index.js";
import { ensureBuilt } from "./helpers/build.js";

const execFileAsync = promisify(execFile);

describe("package foundation", () => {
  it("exports a concrete version string", () => {
    expect(version).toBe("0.1.2");
  });

  it("prints the version for --version", () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      expect(main(["node", "jscn", "--version"])).toBe(0);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(writes.join("")).toBe("0.1.2\n");
  });

  it("prints the version for the version command", () => {
    const writes: string[] = [];
    const originalWrite = process.stdout.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write;

    try {
      expect(main(["node", "jscn", "version"])).toBe(0);
    } finally {
      process.stdout.write = originalWrite;
    }

    expect(writes.join("")).toBe("0.1.2\n");
  });

  it("runs through a symlinked bin entry", async () => {
    await ensureBuilt();

    const tempDir = await mkdtemp(join(tmpdir(), "jscn-bin-"));
    const binPath = join(tempDir, "jscn");
    await symlink(join(process.cwd(), "dist/cli/main.js"), binPath);

    const versionFlag = await execFileAsync(binPath, ["--version"]);
    const versionCommand = await execFileAsync(binPath, ["version"]);

    expect(versionFlag.stdout).toBe("0.1.2\n");
    expect(versionCommand.stdout).toBe("0.1.2\n");
  }, 30_000);
});
