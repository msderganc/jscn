import { createRequire } from "node:module";

import type { SourceFile } from "../source-file.js";

const require = createRequire(import.meta.url);
type ParseFunction = (code: string, options: Record<string, unknown>) => unknown;

let cachedParse: ParseFunction | undefined;

export function parseSourceFile(file: SourceFile): unknown {
  return getParser()(file.text, {
    comment: false,
    ecmaFeatures: { jsx: /\.[jt]sx$/i.test(file.relativePath) },
    filePath: file.absolutePath,
    jsx: /\.[jt]sx$/i.test(file.relativePath),
    loc: true,
    range: true,
    sourceType: "module",
  });
}

function getParser(): ParseFunction {
  cachedParse ??= (require("@typescript-eslint/typescript-estree") as { parse: ParseFunction }).parse;
  return cachedParse;
}
