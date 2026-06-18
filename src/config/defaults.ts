import type { ResolvedConfig } from "./schema.js";

export const defaultConfig: ResolvedConfig = {
  output: {
    format: "text",
    directory: ".jscn/reports",
  },
  analysis: {
    recursive: true,
    followSymlinks: false,
    includePatterns: ["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"],
    excludePatterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/coverage/**",
    ],
    maxFileSizeKb: 1024,
  },
  complexity: {
    enabled: true,
    lowThreshold: 9,
    mediumThreshold: 19,
    maxComplexity: 0,
    reportUnchanged: true,
  },
  dependencies: {
    enabled: true,
    includeTypeOnly: false,
    includeExternal: false,
    maxCycles: 0,
  },
};

export const defaultConfigFileName = ".jscn.toml";
