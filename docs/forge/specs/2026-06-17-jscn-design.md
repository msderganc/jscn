# jscn Design

## Context
`jscn` is the JavaScript/TypeScript counterpart to `pyscn`: a structural code quality analyzer with a CLI, config file, reports, CI exit codes, and MCP tools.

This spec is based on:
- `.forge/memory/sketch-decisions.md`
- `.forge/memory/investigation.md`
- `.forge/memory/investigator.md`
- `.forge/memory/compatibility-matrix.md`
- `.forge/memory/probe-records.md`
- `.forge/memory/solutions.md`

## Goals
- Build a native TypeScript analyzer, not a wrapper around `pyscn`.
- Preserve `pyscn` public behavior where it is meaningful for JS/TS.
- Adapt Python-specific semantics to JS/TS explicitly.
- Ship a useful CLI-first milestone before MCP and advanced analyzers.
- Keep one canonical model for CLI, reports, MCP, and tests.
- Make machine integrations reliable with stable JSON and documented exit codes.

## Non-Goals
- Do not execute project code.
- Do not copy Python-only analyzer assumptions as JS defaults.
- Do not ship full clone, CBO, LCOM, DI, mock-data, HTML, or MCP implementation in the first slice.
- Do not require type-aware analysis for every command when syntax-only analysis is enough.

## Compatibility Classification

### Exact Public Parity
- Commands: `analyze`, `check`, `init`, `version`, `completion`, `help`.
- Analysis selectors: `complexity`, `deadcode`, `clones`, `cbo`, `lcom`, `deps`, `mockdata`, `di`.
- Report families: text, JSON, YAML, CSV, HTML.
- CI outcome categories: clean, quality issues, analysis/input failure.
- MCP tool families: analysis, complexity, clones, coupling, cohesion, dead code, DI, health score.

### JS/TS Adaptation
- File patterns target JS/TS extensions.
- Dependency graph distinguishes runtime edges from type-only edges.
- Module resolution handles ESM, CJS, TS path aliases, package exports, workspaces, and pnpm symlinks.
- Complexity supports JS/TS function forms.
- Module coupling is first-class; class CBO/LCOM are narrower analyzers.
- Dead code starts with unreachable CFG checks, then grows into conservative unused/export-aware analysis.
- DI, mock-data, and architecture rules use JS/TS conventions.

### Intentional Differences
- `jscn` uses documented exit code `2` for analysis/input failure, even though `pyscn 1.22.4` returned `1` in probes.
- `jscn` supports explicit machine-readable JSON output through `--output -`; users do not have to parse human summaries.
- MCP stdout is protocol-clean; logs go to stderr or structured logging.
- Config validation is consistent across `analyze` and `check`.

## Public CLI Contract

### Commands
- `jscn analyze [files...]`
- `jscn check [files...]`
- `jscn init`
- `jscn version`
- `jscn completion <shell>`
- `jscn help`

### Global Flags
- `-h, --help`
- `-v, --verbose`
- `--version`

### `analyze`
First slice:
- `--json`
- `--output <path>` for explicit machine/report destination; `--output -` writes machine JSON to stdout
- `--select complexity,deps`
- `--skip-complexity`
- `--skip-deps`
- `--min-complexity <n>`
- `--config <path>`

Later:
- `--yaml`, `--csv`, `--html`, `--no-open`
- clone, dead-code, CBO, LCOM, DI, and mock-data thresholds.

### `check`
First slice:
- `--select complexity,deps`
- `--max-complexity <n>`
- `--max-cycles <n>`
- `--allow-circular-deps`
- `--quiet`
- `--config <path>`

Exit codes:
- `0`: no quality issues
- `1`: quality issues found
- `2`: analysis/input/config failure

## Config Contract
`jscn init` creates `.jscn.toml`.

Initial sections:
```toml
[output]
format = "text"
directory = ".jscn/reports"

[analysis]
recursive = true
follow_symlinks = false
include_patterns = ["**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"]
exclude_patterns = ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.next/**", "**/coverage/**"]
max_file_size_kb = 1024

[complexity]
enabled = true
low_threshold = 9
medium_threshold = 19
max_complexity = 0
report_unchanged = true

[dependencies]
enabled = true
include_type_only = false
include_external = false
max_cycles = 0
```

Precedence:
1. CLI flags
2. Explicit `--config`
3. `.jscn.toml` discovered from workspace root
4. Defaults

Config validation is shared by `analyze` and `check`.

## Canonical Result Model
All outputs derive from one `AnalysisResult`:

```ts
interface AnalysisResult {
  version: string;
  generatedAt: string;
  durationMs: number;
  root: string;
  configPath?: string;
  summary: AnalysisSummary;
  issues: Issue[];
  analyses: {
    complexity?: ComplexityReport;
    dependencies?: DependencyReport;
    deadCode?: DeadCodeReport;
    clones?: CloneReport;
    coupling?: CouplingReport;
    cohesion?: CohesionReport;
    architecture?: ArchitectureReport;
    di?: DiReport;
    mockData?: MockDataReport;
  };
}
```

Issues share one schema:
```ts
interface Issue {
  id: string;
  analyzer: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  file?: string;
  start?: SourcePosition;
  end?: SourcePosition;
  symbol?: string;
  rule: string;
  details?: Record<string, unknown>;
}
```

## Project Model And Parser Ownership

### Ownership
- TypeScript compiler API owns project graph, `tsconfig`, module resolution, diagnostics, symbols, and type-aware data.
- `@typescript-eslint/typescript-estree` is an adapter for ESTree traversal and node mapping.
- Analyzers consume normalized models, not raw parser nodes as their public contract.

### Parser Modes
- Syntax-only fast mode: default for complexity and simple import graph extraction.
- TS Program-backed mode: used for accurate module resolution, path aliases, project references, symbols, and later type-aware checks.
- Strict diagnostics mode: opt-in failure behavior for projects that want parse/type errors to fail analysis.

### Normalized Model
The project layer produces:
- Workspace root.
- File inventory and inclusion decisions.
- Source files with line maps and language mode.
- Function, class, method, and module declarations.
- Import/export edges with kind: runtime, type-only, export-from, require, dynamic, external, unresolved.
- Diagnostics.
- Optional symbol/type metadata.

## Analyzer Architecture
Analyzers implement a common interface:

```ts
interface Analyzer<TReport> {
  name: string;
  requires: Array<"syntax" | "program" | "dependencies">;
  run(project: ProjectModel, config: ResolvedConfig): Promise<TReport>;
}
```

First analyzers:
- Complexity analyzer.
- Dependency graph analyzer.
- Circular dependency analyzer.

Later analyzers:
- CFG unreachable code.
- Conservative unused/export-aware dead code.
- Clone detection.
- Coupling and cohesion.
- Architecture validation.
- DI anti-patterns.
- Mock/test-data detection.

## Dependency Graph Semantics
- Runtime imports and type-only imports are separate edge kinds.
- Default cycle detection uses runtime edges only.
- Type-only cycles are reported only when configured.
- Static `import`, `export ... from`, CommonJS `require`, and feasible dynamic imports are represented.
- Unresolved dynamic imports are tracked as unknown edges, not silently ignored.
- TS path aliases, package exports, project references, and workspaces are resolved through TypeScript and Node-compatible resolution.

## Report Behavior
- Human stdout remains readable by default.
- Format flags generate files under `.jscn/reports/`.
- Machine JSON is available explicitly through `--output -`.
- JSON is the canonical schema.
- YAML and CSV are generated from canonical JSON after Phase 1.
- HTML escapes all user/project content and uses a restrictive CSP.
- `--no-open` applies to HTML only.

## MCP Design
MCP implementation ships later, but schemas are designed now.

Tools:
- `analyze_code`
- `check_complexity`
- `check_cohesion`
- `check_coupling`
- `detect_clones`
- `detect_di_antipatterns`
- `find_dead_code`
- `get_health_score`

Requirements:
- Stdio protocol output only on stdout.
- Logs and diagnostics on stderr.
- Path arguments normalized and constrained to allowed roots.
- Tool outputs use the canonical result model or analyzer-specific projections.
- Tool schemas are snapshot-tested before MCP release.

## Security Model
- Never execute project code.
- Default `follow_symlinks = false`.
- Normalize and bound file paths.
- Ignore binary/generated/large files by default.
- Enforce configurable max file size.
- Escape all report HTML content.
- Avoid loading TypeScript plugins by default.
- MCP server validates all input paths and options.

## Performance Model
- Syntax-only fast path for first-slice analyzers.
- TS Program creation is cached per config/project root.
- Dependency graph is built once and reused.
- Clone detection uses hashing/bucketing before expensive similarity.
- Large-project benchmarks are release gates before advanced analyzers.

## Test Strategy
- Golden CLI help snapshots.
- Exit-code tests for clean, issue, input failure, and config failure.
- Config generation and precedence tests.
- JSON schema snapshots.
- Analyzer fixtures for JS, TS, TSX, ESM, CJS, path aliases, workspaces, dynamic imports, and cycles.
- Probe fixtures derived from observed `pyscn` behavior.
- Security fixtures for symlinks, path traversal, oversized files, and HTML escaping.
- Performance fixtures for monorepo-scale parsing and clone detection.

## Phased Roadmap
1. Foundation: package, build, CLI shell, `version`, tests.
2. Config and file discovery: `.jscn.toml`, include/exclude, symlink policy.
3. Core contracts: `analyze --json`, `check`, exit codes, canonical result schema.
4. First analyzers: complexity, dependency graph, circular dependencies.
5. Report expansion: YAML, CSV, HTML, file naming, `--no-open`.
6. Dead code: unreachable CFG first, unused/export-aware later.
7. Clone detection: normalized fingerprints, then similarity thresholds.
8. Coupling, cohesion, architecture.
9. DI and mock-data checks.
10. MCP server.
11. Completion scripts, docs, publishing, benchmark gates.

## Open Questions
- Whether `.jscn.toml` should also be supported through `package.json` under a `jscn` key.
- Whether type-aware dependency resolution is default for `deps` or only enabled when a `tsconfig` is found.

## Recommendation
Approve the native layered TypeScript analyzer design with CLI-first delivery. The first implementation plan should build the foundation, config, canonical model, complexity analyzer, dependency graph, cycle check, JSON output, and CI exit behavior before adding advanced analyzers.
