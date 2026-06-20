import { describe, expect, it } from "vitest";

import { main } from "../../src/cli/main.js";

describe("version command", () => {
  it("prints version with --version", () => {
    expect(captureStdout(() => main(["node", "jscn", "--version"]))).toBe("0.1.2\n");
  });

  it("prints version with version command", () => {
    expect(captureStdout(() => main(["node", "jscn", "version"]))).toBe("0.1.2\n");
  });
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
