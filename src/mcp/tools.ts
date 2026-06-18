import { resolve } from "node:path";

import { runAnalysis } from "../analyzers/runner.js";
import { loadConfig } from "../config/load.js";
import type { AnalysisResult } from "../core/schema.js";
import { discoverProject } from "../project/discover.js";
import { assertInsideRoot } from "../project/path-safety.js";
import type { HealthScore, McpToolDefinition } from "./schema.js";

const analyzerNames = ["analysis", "complexity", "deps", "clones", "coupling", "cohesion", "deadcode", "architecture", "di", "mockdata", "health"] as const;

export function listTools(): McpToolDefinition[] {
  return analyzerNames.map((name) => ({
    name: `jscn_${name}`,
    description: `Run jscn ${name} analysis`,
    inputSchema: {
      type: "object",
      required: ["root"],
      properties: {
        root: { type: "string" },
        files: { type: "array", items: { type: "string" } },
        configPath: { type: "string" },
      },
    },
  }));
}

export function runTool(name: string, input: { root: string; files?: string[]; configPath?: string }): AnalysisResult | HealthScore {
  const root = resolve(input.root);
  const files = (input.files ?? ["."]).map((file) => assertInsideRoot(resolve(root, file), root));
  const relativeFiles = files.map((file) => file.slice(root.length + 1) || ".");
  const configPath = input.configPath ? assertInsideRoot(resolve(root, input.configPath), root) : undefined;
  const loaded = loadConfig({ cwd: root, configPath });
  const result = runAnalysis({
    project: discoverProject({ root, inputs: relativeFiles, config: loaded.config }),
    config: loaded.config,
    configPath: loaded.configPath,
    selectedAnalyzers: toolSelection(name),
    generatedAt: new Date().toISOString(),
    startedAtMs: 0,
    endedAtMs: 0,
  });
  return name === "jscn_health" ? healthScore(result) : result;
}

export function healthScore(result: AnalysisResult): HealthScore {
  const critical = result.summary.issueCounts.critical;
  const error = result.summary.issueCounts.error;
  const warning = result.summary.issueCounts.warning;
  const cycleCount = result.analyses.dependencies?.cycles.length ?? 0;
  const highComplexityCount = result.analyses.complexity?.functions.filter((item) => item.riskLevel === "high").length ?? 0;
  const score = Math.max(0, 100 - Math.min(100, critical * 25 + error * 15 + warning * 5 + cycleCount * 5 + highComplexityCount * 3));
  return { score, grade: grade(score), inputs: { critical, error, warning, cycleCount, highComplexityCount } };
}

function toolSelection(name: string): string[] {
  const key = name.replace(/^jscn_/, "");
  if (key === "analysis" || key === "health") {
    return ["complexity", "deps", "deadcode", "clones", "coupling", "cohesion", "architecture", "di", "mockdata"];
  }
  return [key];
}

function grade(score: number): HealthScore["grade"] {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
