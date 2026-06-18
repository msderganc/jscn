import type { CohesionReport, Issue } from "../core/schema.js";
import { buildClassModel } from "../project/classes.js";
import type { ProjectModel } from "../project/model.js";

interface ClassCohesion {
  name: string;
  file: string;
  methodCount: number;
  fieldCount: number;
  lcom: number;
}

export function analyzeCohesion(project: ProjectModel): CohesionReport {
  return {
    classes: buildClassModel(project).classes.map((item) => ({
      name: item.name,
      file: item.file,
      methodCount: item.methods.length,
      fieldCount: item.fields.length,
      lcom: item.methods.length > 0 && item.fields.length === 0 ? 1 : 0,
    })),
  };
}

export function cohesionIssues(report: CohesionReport): Issue[] {
  return (report.classes as ClassCohesion[])
    .filter((item) => item.lcom > 0)
    .map((item) => ({
      id: `cohesion:class:${item.file}:${item.name}`,
      analyzer: "cohesion",
      severity: "warning" as const,
      message: `Low class cohesion: ${item.name}`,
      file: item.file,
      symbol: item.name,
      rule: "cohesion.lcom",
      details: { ...item },
    }));
}
