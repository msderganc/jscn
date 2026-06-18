import type { CloneReport, Issue } from "../core/schema.js";
import type { ProjectModel } from "../project/model.js";

interface CloneGroup {
  fingerprint: string;
  files: string[];
  occurrences: number;
}

export function analyzeClones(project: ProjectModel): CloneReport {
  const groups = new Map<string, Set<string>>();
  for (const file of project.files) {
    for (const fingerprint of fingerprints(file.text)) {
      const files = groups.get(fingerprint) ?? new Set<string>();
      files.add(file.relativePath);
      groups.set(fingerprint, files);
    }
  }

  return {
    groups: [...groups.entries()]
      .filter(([, files]) => files.size > 1)
      .map(([fingerprint, files]) => ({ fingerprint, files: [...files].sort(), occurrences: files.size })),
  };
}

export function cloneIssues(report: CloneReport): Issue[] {
  return (report.groups as CloneGroup[]).map((group, index) => ({
    id: `clones:group:${index + 1}`,
    analyzer: "clones",
    severity: "warning",
    message: `Duplicate code fingerprint appears in ${group.occurrences} files`,
    file: group.files[0],
    rule: "clones.duplicate",
    details: { ...group },
  }));
}

function fingerprints(text: string): string[] {
  const normalized = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const chunks = normalized.match(/.{1,120}/g) ?? [];
  return chunks.filter((chunk) => chunk.length >= 40);
}
