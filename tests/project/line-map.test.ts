import { describe, expect, it } from "vitest";

import { createLineMap } from "../../src/project/line-map.js";

describe("createLineMap", () => {
  it("maps offsets to one-based source positions", () => {
    const map = createLineMap("one\ntwo\nthree");

    expect(map.positionAt(0)).toEqual({ line: 1, column: 1 });
    expect(map.positionAt(4)).toEqual({ line: 2, column: 1 });
    expect(map.positionAt(8)).toEqual({ line: 3, column: 1 });
  });

  it("maps source positions back to offsets", () => {
    const map = createLineMap("one\ntwo\nthree");

    expect(map.offsetAt({ line: 2, column: 2 })).toBe(5);
  });
});
