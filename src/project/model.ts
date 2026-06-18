import type { ResolvedConfig } from "../config/schema.js";
import type { SourceFile } from "./source-file.js";

export interface SkippedFile {
  path: string;
  reason: "binary" | "symlink" | "excluded";
}

export interface ProjectModel {
  root: string;
  config: ResolvedConfig;
  files: SourceFile[];
  skippedFiles: SkippedFile[];
}
