import { writeFileSync } from "node:fs";

import { defaultConfigFileName } from "./defaults.js";

export const defaultConfigToml = `[output]
format = "text"
directory = ".jscn/reports"

[analysis]
recursive = true
follow_symlinks = false
include_patterns = ["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"]
exclude_patterns = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**"]
max_file_size_kb = 1024

[complexity]
enabled = true
low_threshold = 9
medium_threshold = 19
max_complexity = 0
report_unchanged = true

[dependencies]
enabled = true
include_type_only = false
include_external = false
max_cycles = 0
`;

interface WriteDefaultConfigOptions {
  overwrite?: boolean;
}

export function writeDefaultConfig(path = defaultConfigFileName, options: WriteDefaultConfigOptions = {}): void {
  writeFileSync(path, defaultConfigToml, { encoding: "utf8", flag: options.overwrite ? "w" : "wx" });
}
