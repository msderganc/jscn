import { describe, expect, it } from "vitest";

import { createProgram, main } from "../../src/cli/main.js";

describe("help output", () => {
  it("registers the public commands", () => {
    const commands = createProgram().commands.map((command) => command.name()).sort();
    expect(commands).toEqual(["analyze", "check", "completion", "init", "mcp", "version"]);
  });

  it("returns deterministic exit code for unknown commands", () => {
    expect(main(["node", "jscn", "unknown"])).toBe(1);
  });
});
