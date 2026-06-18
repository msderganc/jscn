import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ProjectDiscoveryError } from "../../src/project/errors.js";
import { assertInsideRoot, toProjectRelativePath } from "../../src/project/path-safety.js";

describe("path safety", () => {
  it("normalizes paths inside the root", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-root-"));
    const path = join(root, "src", "..", "src", "a.ts");

    expect(assertInsideRoot(path, root)).toBe(join(root, "src", "a.ts"));
    expect(toProjectRelativePath(path, root)).toBe("src/a.ts");
  });

  it("rejects traversal outside the root", () => {
    const root = mkdtempSync(join(tmpdir(), "jscn-root-"));

    expect(() => assertInsideRoot(join(root, "..", "outside.ts"), root)).toThrow(ProjectDiscoveryError);
  });
});
