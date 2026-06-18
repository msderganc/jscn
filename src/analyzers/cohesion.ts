import type { CohesionReport, Issue } from "../core/schema.js";
import { buildClassModel } from "../project/classes.js";
import type { ProjectModel } from "../project/model.js";

interface ClassCohesion {
  name: string;
  file: string;
  methodCount: number;
  fieldCount: number;
  lcom: number;
  ignoredReason?: string;
}

export function analyzeCohesion(project: ProjectModel): CohesionReport {
  return {
    classes: buildClassModel(project).classes.map((item) => {
      const ignoredReason = ignoredReasonFor(item);
      return {
        name: item.name,
        file: item.file,
        methodCount: item.methods.length,
        fieldCount: item.fields.length,
        lcom: ignoredReason ? 0 : lcom(item.methodFieldUses),
        ignoredReason,
      };
    }),
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

function ignoredReasonFor(item: {
  kind?: string;
  methods: string[];
  fields: string[];
}): string | undefined {
  if (item.kind === "error") {
    return "error-class";
  }

  if (item.kind === "component") {
    return "component-class";
  }

  if (item.methods.length < 2) {
    return "too-few-methods";
  }

  if (item.fields.length === 0) {
    return "no-fields";
  }

  return undefined;
}

function lcom(methodFieldUses: Array<{ fields: string[] }>): number {
  let connectedPairs = 0;
  let disjointPairs = 0;

  for (let left = 0; left < methodFieldUses.length; left++) {
    for (let right = left + 1; right < methodFieldUses.length; right++) {
      const leftMethod = methodFieldUses[left];
      const rightMethod = methodFieldUses[right];
      if (!leftMethod || !rightMethod) {
        continue;
      }
      if (sharesField(leftMethod.fields, rightMethod.fields)) {
        connectedPairs += 1;
      } else {
        disjointPairs += 1;
      }
    }
  }

  return Math.max(0, disjointPairs - connectedPairs);
}

function sharesField(left: string[], right: string[]): boolean {
  const rightFields = new Set(right);
  return left.some((field) => rightFields.has(field));
}
