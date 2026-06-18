import type { Command } from "commander";

import { loadConfig } from "../../config/load.js";
import type { ConfigOverrides } from "../../config/schema.js";
import { ConfigValidationError } from "../../config/schema.js";
import { assertSupportedAnalyzers, parseSelectedAnalyzers, runAnalysis } from "../../analyzers/runner.js";
import { ProjectDiscoveryError } from "../../project/errors.js";
import { discoverProject } from "../../project/discover.js";
import { nowIso, nowMs } from "../../reporters/clock.js";
import { renderReport, writeReport } from "../../reporters/index.js";
import { reportPath } from "../../reporters/report-path.js";
import { renderText } from "../../reporters/text.js";
import { analysisFailureExitCode } from "../exit-code.js";
import { resolveAnalysisInputs } from "../input-root.js";
import type { OutputFormat } from "../../config/schema.js";

interface AnalyzeOptions {
  config?: string;
  json?: boolean;
  yaml?: boolean;
  csv?: boolean;
  html?: boolean;
  open?: boolean;
  output?: string;
  select?: string;
  skipComplexity?: boolean;
  skipDeps?: boolean;
  minComplexity?: string;
}

export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze")
    .argument("[files...]", "Files or directories to analyze")
    .description("Run comprehensive analysis on JavaScript and TypeScript files")
    .option("-c, --config <path>", "Configuration file path")
    .option("--json", "Generate JSON report file")
    .option("--yaml", "Generate YAML output")
    .option("--csv", "Generate CSV output")
    .option("--html", "Generate HTML output")
    .option("--no-open", "Do not open generated HTML reports", false)
    .option("--output <path>", "Write machine output to a path, or '-' for stdout")
    .option("--select <analyses>", "Comma-separated analyses to run")
    .option("--skip-complexity", "Skip complexity analysis")
    .option("--skip-deps", "Skip dependency analysis")
    .option("--min-complexity <n>", "Minimum complexity to report")
    .action((files: string[], options: AnalyzeOptions) => {
      try {
        const generatedAt = nowIso();
        const startedAtMs = nowMs();
        const selectedAnalyzers = parseSelectedAnalyzers(options.select, options.skipComplexity, options.skipDeps);
        assertSupportedAnalyzers(selectedAnalyzers);
        const analysisInputs = resolveAnalysisInputs(files);
        const loaded = loadConfig({ cwd: analysisInputs.root, configPath: options.config, overrides: analyzeOverrides(options) });
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
        const outputFormat = analyzeOutputFormat(options, loaded.config.output.format);
        const openHtml = shouldOpenHtmlReport(outputFormat, options);

        if (options.output === "-") {
          process.stdout.write(renderReport(result, outputFormat));
        } else if (options.output) {
          writeReport(options.output, result, outputFormat);
        } else {
          if (outputFormat !== "text") {
            writeReport(reportPath("analyze", loaded.config, generatedAt, outputFormat), result, outputFormat);
          }
          process.stdout.write(renderText(result));
        }
        if (openHtml) {
          throw new Error("HTML auto-open is disabled in this build");
        }

        process.exitCode = 0;
      } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = analysisFailureExitCode;
      }
    });
}

function analyzeOverrides(options: AnalyzeOptions): ConfigOverrides {
  if (!options.minComplexity) {
    return {};
  }

  const minComplexity = Number(options.minComplexity);
  if (!Number.isInteger(minComplexity) || minComplexity < 1) {
    throw new ConfigValidationError(["--min-complexity must be a positive integer"]);
  }

  return { complexity: { lowThreshold: minComplexity, reportUnchanged: false } };
}

function analyzeOutputFormat(options: AnalyzeOptions, configured: OutputFormat): OutputFormat {
  if (options.html) {
    return "html";
  }
  if (options.csv) {
    return "csv";
  }
  if (options.yaml) {
    return "yaml";
  }
  if (options.json) {
    return "json";
  }
  if (options.output && configured === "text") {
    return "json";
  }
  return configured;
}

function shouldOpenHtmlReport(format: OutputFormat, options: AnalyzeOptions): boolean {
  return format === "html" && options.open === true;
}
