import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProject } from "../../src/project/discover.js";
import { buildClassModel } from "../../src/project/classes.js";

describe("buildClassModel", () => {
  it("extracts declarations, assigned expressions, members, extends, and implements", () => {
    const root = createProject({
      "src/a.ts": `
interface Worker {}
class Base {}
export class Service extends Base implements Worker {
  value = 1;
  run() {}
}
const Assigned = class {
  field = true;
  call() {}
};
`,
    });

    const model = buildClassModel(discoverProject({ root }));

    expect(model.classes).toMatchObject([
      { name: "Base" },
      { name: "Service", methods: ["run"], fields: ["value"], extends: "Base", implements: ["Worker"] },
      { name: "Assigned", methods: ["call"], fields: ["field"] },
    ]);
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-classes-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
