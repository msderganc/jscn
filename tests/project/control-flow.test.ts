import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildControlFlowModel } from "../../src/project/control-flow.js";
import { discoverProject } from "../../src/project/discover.js";

describe("buildControlFlowModel", () => {
  it("records conservative unreachable statements after terminal control flow", () => {
    const root = createProject({
      "src/a.ts": `
function a() {
  return 1;
  console.log('unreachable');
}
function b() {
  throw new Error('x');
  console.log('unreachable');
}
`,
    });

    const model = buildControlFlowModel(discoverProject({ root }));

    expect(model.unreachable.map((item) => item.reason)).toEqual(["after-return", "after-throw"]);
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-control-flow-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
