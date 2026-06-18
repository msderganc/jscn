import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProject } from "../../src/project/discover.js";
import { buildSymbolModel } from "../../src/project/symbols.js";

describe("buildSymbolModel", () => {
  it("counts JSX component tags as references without treating intrinsic tags as locals", () => {
    const root = createProject({
      "src/a.tsx": `
function Card() { return <div />; }
const Section = { Label: Card };
function Page() { return <><Card /><Section.Label /><div /></>; }
`,
    });

    const model = buildSymbolModel(discoverProject({ root }));
    const references = model.references.map((item) => `${item.kind}:${item.name}`);

    expect(references).toContain("jsx:Card");
    expect(references).toContain("jsx:Section");
    expect(references).not.toContain("jsx:div");
  }, 15_000);
});

function createProject(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "jscn-symbols-"));
  for (const [path, source] of Object.entries(files)) {
    const absolute = join(root, path);
    mkdirSync(join(absolute, ".."), { recursive: true });
    writeFileSync(absolute, source, "utf8");
  }
  return root;
}
