import { mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

import { main } from "../../src/cli/main.js";

describe("complexity-only vertical CLI", () => {
  it("writes a JSON report file for analyze --json", () => {
    const root = createVerticalFixture();

    const result = withCwd(root, () => main(["node", "jscn", "analyze", "--select", "complexity", "--json", "src"]));

    expect(result).toBe(0);
    const reportsDir = join(root, ".jscn/reports");
    const reports = readdirSync(reportsDir);
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatch(/^analyze_.*\.json$/);
    const json = JSON.parse(readFileSync(join(reportsDir, reports[0] ?? ""), "utf8"));
    expect(json.analyses.complexity.functions.length).toBeGreaterThan(0);
  }, 15_000);

  it("writes canonical JSON to stdout with --output -", () => {
    const root = createVerticalFixture();

    const output = captureStdout(() =>
      withCwd(root, () => main(["node", "jscn", "analyze", "--select", "complexity", "--json", "--output", "-", "src"]))
    );

    const json = JSON.parse(output);
    expect(json.summary.analyzedFiles).toBe(2);
    expect(output).not.toContain("Files:");
  });

  it("keeps analyze --output - stdout JSON-only and sends errors to stderr", () => {
    const root = createVerticalFixture();
    writeFileSync(join(root, "bad.toml"), "[complexity]\nlow_threshold = 20\nmedium_threshold = 1\n", "utf8");

    const stdout = captureStdout(() => {
      const stderr = captureStderr(() =>
        withCwd(root, () => main(["node", "jscn", "analyze", "--config", "bad.toml", "--output", "-", "src"]))
      );

      expect(stderr).toContain("Invalid jscn configuration");
    });

    expect(stdout).toBe("");
  });

  it("returns 0 for clean check", () => {
    const root = createVerticalFixture();

    const result = withCwd(root, () =>
      main(["node", "jscn", "check", "--select", "complexity", "--max-complexity", "20", "src/clean.ts"])
    );

    expect(result).toBe(0);
  });

  it("suppresses clean quiet output and still prints issues", () => {
    const root = createVerticalFixture();

    const cleanOutput = captureStdout(() =>
      withCwd(root, () => main(["node", "jscn", "check", "--quiet", "--select", "complexity", "--max-complexity", "20", "src/clean.ts"]))
    );
    const issueOutput = captureStdout(() =>
      withCwd(root, () => main(["node", "jscn", "check", "--quiet", "--select", "complexity", "--max-complexity", "2", "src/complex.ts"]))
    );

    expect(cleanOutput).toBe("");
    expect(issueOutput).toContain("Issues:");
  });

  it("returns 1 when complexity issues exceed the threshold", () => {
    const root = createVerticalFixture();

    const result = withCwd(root, () =>
      main(["node", "jscn", "check", "--select", "complexity", "--max-complexity", "2", "src/complex.ts"])
    );

    expect(result).toBe(1);
  });

  it("still checks max complexity when reporting filters hide unchanged functions", () => {
    const root = createVerticalFixture();
    writeFileSync(
      join(root, ".jscn.toml"),
      "[complexity]\nreport_unchanged = false\nlow_threshold = 9\nmedium_threshold = 19\n",
      "utf8"
    );

    const result = withCwd(root, () =>
      main(["node", "jscn", "check", "--select", "complexity", "--max-complexity", "2", "src/complex.ts"])
    );

    expect(result).toBe(1);
  });

  it("honors --skip-deps when deps appears in --select", () => {
    const root = createVerticalFixture();

    const result = withCwd(root, () =>
      main(["node", "jscn", "analyze", "--select", "complexity,deps", "--skip-deps", "src/clean.ts"])
    );

    expect(result).toBe(0);
  });

  it("returns 1 for dependency cycles and honors --allow-circular-deps", () => {
    const root = createVerticalFixture();
    writeFileSync(join(root, "src/a.ts"), "import './b';\n", "utf8");
    writeFileSync(join(root, "src/b.ts"), "import './a';\n", "utf8");

    expect(withCwd(root, () => main(["node", "jscn", "check", "--select", "deps", "src/a.ts", "src/b.ts"]))).toBe(1);
    expect(
      withCwd(root, () => main(["node", "jscn", "check", "--select", "deps", "--allow-circular-deps", "src/a.ts", "src/b.ts"]))
    ).toBe(0);
  });

  it("enables dependency analysis when --max-cycles is provided", () => {
    const root = createVerticalFixture();
    writeFileSync(join(root, "src/a.ts"), "import './b';\n", "utf8");
    writeFileSync(join(root, "src/b.ts"), "import './a';\n", "utf8");

    expect(withCwd(root, () => main(["node", "jscn", "check", "--max-cycles", "0", "src/a.ts", "src/b.ts"]))).toBe(1);
  });

  it("rejects --min-complexity 0 consistently", () => {
    const root = createVerticalFixture();

    const result = withCwd(root, () => main(["node", "jscn", "analyze", "--min-complexity", "0", "src"]));

    expect(result).toBe(2);
  });

  it("returns 2 for invalid config, invalid cycle threshold, and missing paths", () => {
    const root = createVerticalFixture();
    writeFileSync(join(root, "bad.toml"), "[complexity]\nlow_threshold = 20\nmedium_threshold = 1\n", "utf8");

    expect(withCwd(root, () => main(["node", "jscn", "check", "--config", "bad.toml", "src"]))).toBe(2);
    expect(withCwd(root, () => main(["node", "jscn", "check", "--max-cycles", "-1", "src"]))).toBe(2);
    expect(withCwd(root, () => main(["node", "jscn", "check", "missing.ts"]))).toBe(2);
  });

  it("returns 2 for no supported files, oversized files, unsafe traversal, and outside-root symlink targets", () => {
    const root = createVerticalFixture();
    const outside = mkdtempSync(join(tmpdir(), "jscn-outside-"));
    writeFileSync(join(outside, "outside.ts"), "export const outside = true;\n", "utf8");
    mkdirSync(join(root, "docs"), { recursive: true });
    writeFileSync(join(root, "docs/README.md"), "# docs\n", "utf8");
    writeFileSync(join(root, ".jscn.toml"), "[analysis]\nmax_file_size_kb = 1\nfollow_symlinks = true\n", "utf8");
    writeFileSync(join(root, "src/large.ts"), `export const large = "${"x".repeat(2048)}";\n`, "utf8");
    symlinkSync(join(outside, "outside.ts"), join(root, "src/outside-link.ts"));

    expect(withCwd(root, () => main(["node", "jscn", "check", "docs"]))).toBe(2);
    expect(withCwd(root, () => main(["node", "jscn", "check", "src/large.ts"]))).toBe(2);

    const outsideInput = relative(root, join(outside, "outside.ts"));
    const traversalStderr = captureStderr(() => expect(withCwd(root, () => main(["node", "jscn", "check", outsideInput]))).toBe(2));
    const symlinkStderr = captureStderr(() => expect(withCwd(root, () => main(["node", "jscn", "check", "src/outside-link.ts"]))).toBe(2));
    expect(traversalStderr).toContain("Path is outside the analysis root");
    expect(symlinkStderr).toContain("Path is outside the analysis root");
  });
});

function createVerticalFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-vertical-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/clean.ts"), "export const clean = () => true;\n", "utf8");
  writeFileSync(
    join(root, "src/complex.ts"),
    `
export function complex(v: string) {
  if (v) return true;
  if (v === 'a') return true;
  if (v === 'b') return true;
  return false;
}
`,
    "utf8"
  );
  return root;
}

function withCwd<T>(cwd: string, run: () => T): T {
  const previous = process.cwd();
  const previousExitCode = process.exitCode;
  process.chdir(cwd);
  process.exitCode = undefined;

  try {
    return run();
  } finally {
    process.chdir(previous);
    process.exitCode = previousExitCode;
  }
}

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

function captureStderr(run: () => unknown): string {
  const writes: string[] = [];
  const originalWrite = process.stderr.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    run();
  } finally {
    process.stderr.write = originalWrite;
  }

  return writes.join("");
}
