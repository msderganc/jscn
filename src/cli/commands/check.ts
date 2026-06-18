import type { Command } from "commander";

import { loadConfig } from "../../config/load.js";
import type { ConfigOverrides } from "../../config/schema.js";
import { ConfigValidationError } from "../../config/schema.js";
import { assertSupportedAnalyzers, parseSelectedAnalyzers, runAnalysis } from "../../analyzers/runner.js";
import { ProjectDiscoveryError } from "../../project/errors.js";
import { discoverProject } from "../../project/discover.js";
import { nowIso, nowMs } from "../../reporters/clock.js";
import { renderText } from "../../reporters/text.js";
import { analysisFailureExitCode, exitCodeForResult } from "../exit-code.js";
import { resolveAnalysisInputs } from "../input-root.js";

interface CheckOptions {
  config?: string;
  quiet?: boolean;
  select?: string;
  maxComplexity?: string;
  maxCycles?: string;
  allowCircularDeps?: boolean;
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .argument("[files...]", "Files or directories to check")
    .description("Quick code quality check optimized for CI")
    .option("-c, --config <path>", "Configuration file path")
    .option("-q, --quiet", "Suppress output unless issues are found")
    .option("--select <analyses>", "Comma-separated analyses to run")
    .option("--max-complexity <n>", "Maximum allowed complexity")
    .option("--max-cycles <n>", "Maximum allowed circular dependency cycles")
    .option("--allow-circular-deps", "Allow circular dependencies")
    .action((files: string[], options: CheckOptions) => {
      try {
        const generatedAt = nowIso();
        const startedAtMs = nowMs();
        const selectedAnalyzers = checkSelectedAnalyzers(options);
        assertSupportedAnalyzers(selectedAnalyzers);
        const analysisInputs = resolveAnalysisInputs(files);
        const loaded = loadConfig({ cwd: analysisInputs.root, configPath: options.config, overrides: checkOverrides(options) });
        const project = discoverProject({ root: analysisInputs.root, inputs: analysisInputs.inputs, config: loaded.config });
        if (project.files.length === 0) {
          throw new ProjectDiscoveryError("INPUT_NOT_FOUND", project.root, "No supported JavaScript or TypeScript files found");
        }

        const result = runAnalysis({
          project,
          config: loaded.config,
          configPath: loaded.configPath,
          selectedAnalyzers,
          generatedAt,
          startedAtMs,
          endedAtMs: 0,
        });
        result.durationMs = Math.max(0, nowMs() - startedAtMs);

        if (!options.quiet || result.summary.qualityIssueCount > 0) {
          process.stdout.write(renderText(result));
        }

        process.exitCode = exitCodeForResult(result);
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = analysisFailureExitCode;
      }
    });
}

function checkOverrides(options: CheckOptions): ConfigOverrides {
  const complexity: ConfigOverrides["complexity"] = {};

  if (options.maxComplexity !== undefined) {
    const maxComplexity = Number(options.maxComplexity);
    if (!Number.isInteger(maxComplexity) || maxComplexity < 0) {
      throw new ConfigValidationError(["--max-complexity must be a non-negative integer"]);
    }
    complexity.maxComplexity = maxComplexity;
  }

  if (options.maxCycles !== undefined) {
    const maxCycles = Number(options.maxCycles);
    if (!Number.isInteger(maxCycles) || maxCycles < 0) {
      throw new ConfigValidationError(["--max-cycles must be a non-negative integer"]);
    }
    return {
      ...(Object.keys(complexity).length > 0 ? { complexity } : {}),
      dependencies: { maxCycles },
    };
  }

  return {
    ...(Object.keys(complexity).length > 0 ? { complexity } : {}),
    ...(options.allowCircularDeps ? { dependencies: { maxCycles: Number.MAX_SAFE_INTEGER } } : {}),
  };
}

function checkSelectedAnalyzers(options: CheckOptions): string[] {
  if (options.select) {
    return parseSelectedAnalyzers(options.select);
  }

  if (options.maxCycles !== undefined || options.allowCircularDeps) {
    return ["complexity", "deps"];
  }

  return parseSelectedAnalyzers(undefined);
}
