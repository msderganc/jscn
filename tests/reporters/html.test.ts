import { describe, expect, it } from "vitest";

import { renderHtml } from "../../src/reporters/html.js";
import { sampleResult } from "./helpers.js";

describe("html reporter", () => {
  it("escapes project-controlled values and includes a restrictive CSP", () => {
    const output = renderHtml(sampleResult());

    expect(output).toContain('http-equiv="Content-Security-Policy"');
    expect(output).toContain("default-src 'none'");
    expect(output).toContain("unsafe &lt;script&gt;alert(1)&lt;/script&gt;, value");
    expect(output).not.toContain("<script>alert(1)</script>");
  });
});
