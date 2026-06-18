import type { CloneReport, Issue } from "../core/schema.js";
import type { ClonesConfig } from "../config/schema.js";
import type { ProjectModel } from "../project/model.js";
import { isTestPath } from "../project/path-classification.js";

interface CloneGroup {
  fingerprint: string;
  files: string[];
  occurrences: number;
  kind: "import-boilerplate" | "test-boilerplate" | "source-duplicate";
}

export function analyzeClones(project: ProjectModel, config: ClonesConfig): CloneReport {
  const groups = new Map<string, Set<string>>();
  for (const file of project.files) {
    for (const fingerprint of fingerprints(file.text, config)) {
      const files = groups.get(fingerprint) ?? new Set<string>();
      files.add(file.relativePath);
      groups.set(fingerprint, files);
    }
  }

  return {
    groups: [...groups.entries()]
      .filter(([, files]) => files.size > 1)
      .map(([fingerprint, files]) => {
        const sortedFiles = [...files].sort();
        return { fingerprint, files: sortedFiles, occurrences: files.size, kind: classifyClone(fingerprint, sortedFiles) };
      }),
  };
}

export function cloneIssues(report: CloneReport, config: ClonesConfig): Issue[] {
  return (report.groups as CloneGroup[])
    .filter((group) => (group.kind === "source-duplicate" && nonImportLength(group.fingerprint) >= config.minNonImportChars) || config.includeTestBoilerplate)
    .map((group, index) => ({
      id: `clones:group:${index + 1}`,
      analyzer: "clones",
      severity: "warning",
      message: `Duplicate code fingerprint appears in ${group.occurrences} files`,
      file: group.files[0],
      rule: "clones.duplicate",
      details: { ...group },
    }));
}

function fingerprints(text: string, config: ClonesConfig): string[] {
  const normalized = text
    .replace(/\/\/.*$/gm, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const chunks = normalized.match(/.{1,120}/g) ?? [];
  return chunks.filter((chunk) => chunk.length >= config.minNormalizedChars);
}

function classifyClone(fingerprint: string, files: string[]): CloneGroup["kind"] {
  if (files.every((file) => isTestPath(file))) {
    return "test-boilerplate";
  }

  if (/^(["']use client["']; )?import\b/.test(fingerprint) || /^import\b/.test(fingerprint)) {
    return "import-boilerplate";
  }

  return "source-duplicate";
}

function nonImportLength(chunk: string): number {
  return chunk
    .split(";")
    .filter((part) => !part.trimStart().startsWith("import "))
    .join(";")
    .trim().length;
}
