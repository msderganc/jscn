import { describe, expect, it } from "vitest";

import { isFixturePath, isGeneratedPath, isTestPath } from "../../src/project/path-classification.js";

describe("path classification", () => {
  it("detects common test paths", () => {
    expect(isTestPath("tests/unit/a.ts")).toBe(true);
    expect(isTestPath("src/app/__tests__/fixtures.ts")).toBe(true);
    expect(isTestPath("src/app/__test__/a.ts")).toBe(true);
    expect(isTestPath("src/app/a.test.tsx")).toBe(true);
    expect(isTestPath("src/app/a.spec.mts")).toBe(true);
    expect(isTestPath("src/app/page.tsx")).toBe(false);
  });

  it("detects fixture and generated paths", () => {
    expect(isFixturePath("src/server/data/__fixtures__/users.ts")).toBe(true);
    expect(isFixturePath("src/server/data/fixtures/users.ts")).toBe(true);
    expect(isFixturePath("src/server/data/user.fixture.ts")).toBe(true);
    expect(isGeneratedPath(".next/dev/types/routes.d.ts")).toBe(true);
    expect(isGeneratedPath("dist/index.js")).toBe(true);
    expect(isGeneratedPath("src/index.ts")).toBe(false);
  });
});
