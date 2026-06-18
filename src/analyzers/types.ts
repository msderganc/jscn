import type { ResolvedConfig } from "../config/schema.js";
import type { ProjectModel } from "../project/model.js";

export type AnalyzerRequirement = "syntax" | "program" | "dependencies";

export interface Analyzer<TReport> {
  name: string;
  requires: AnalyzerRequirement[];
  run(project: ProjectModel, config: ResolvedConfig): Promise<TReport>;
}
