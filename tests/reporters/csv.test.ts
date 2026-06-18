import { describe, expect, it } from "vitest";

import { renderCsv } from "../../src/reporters/csv.js";
import { sampleResult } from "./helpers.js";

describe("csv reporter", () => {
  it("renders issue rows with stable escaped headers", () => {
    const output = renderCsv(sampleResult());
    const [header, row] = output.trimEnd().split("\n");

    expect(header).toBe("id,analyzer,severity,file,line,column,rule,message");
    expect(row).toBe(
      'complexity:high:src/a.ts:1,complexity,warning,src/a.ts,1,2,complexity.max_complexity,"unsafe <script>alert(1)</script>, value"'
    );
  });
});
