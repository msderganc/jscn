import type { Issue, MockDataReport } from "../core/schema.js";
import type { ProjectModel } from "../project/model.js";
import { isFixturePath, isTestPath } from "../project/path-classification.js";

const fakePatterns = [/lorem ipsum/i, /test@example\.com/i, /john doe/i, /jane doe/i];

export function analyzeMockData(project: ProjectModel): MockDataReport {
  const issues: Issue[] = [];
  for (const file of project.files) {
    if (isTestPath(file.relativePath) || isFixturePath(file.relativePath)) {
      continue;
    }
    const lines = file.text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (fakePatterns.some((pattern) => pattern.test(line))) {
        issues.push({
          id: `mockdata:literal:${file.relativePath}:${index + 1}`,
          analyzer: "mockdata",
          severity: "warning",
          message: "Mock-looking data literal in production path",
          file: file.relativePath,
          start: { line: index + 1, column: 1 },
          rule: "mockdata.literal",
        });
      }
    });
  }
  return { issues };
}

export function mockDataIssues(report: MockDataReport): Issue[] {
  return report.issues;
}
