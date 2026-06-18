# jscn

JavaScript and TypeScript structural code quality analyzer.

## Background

jscn is inspired by `pyscn` and adapts its structural analysis methods for JavaScript and TypeScript projects. It keeps the same broad idea: scan a codebase statically, report complexity and dependency health, and expose the results through CLI-friendly checks and machine-readable reports.

## Install

```sh
npm install -D @msderganc/jscn
```

## Quick Start

```sh
jscn init
jscn analyze --json src
jscn check --select complexity,deps src
```

Use stdout for automation:

```sh
jscn analyze --output - src
jscn analyze --yaml --output report.yaml src
jscn analyze --csv --output report.csv src
jscn analyze --html --no-open --output report.html src
```

## Analyzers

Selectors: `complexity`, `deps`, `deadcode`, `clones`, `coupling`, `cbo`, `cohesion`, `lcom`, `architecture`, `di`, `mockdata`.

- `complexity` measures function-level cyclomatic and cognitive complexity. It looks at branches, nesting, loops, switch cases, conditionals, and similar control-flow structures.
- `deps` builds a dependency graph from imports, exports, `require()` calls, and dynamic imports. It reports dependency edges, unresolved imports, and runtime cycles.
- `deadcode` looks for unreachable statements and conservative unused local declarations. Exported declarations are treated cautiously to avoid noisy findings.
- `clones` finds repeated normalized source chunks across files. It is useful for spotting duplicated component setup, test boilerplate, and copied logic.
- `coupling` / `cbo` reports module fan-in and fan-out. High fan-out points to files that know about many other modules.
- `cohesion` / `lcom` scores class cohesion by looking at methods and field usage. Low cohesion can point to classes that are doing unrelated work.
- `architecture` checks dependency boundaries. The default rules focus on domain-to-infrastructure style violations and normalized project-relative paths.
- `di` flags container lookups outside composition roots. It is meant to catch service locator usage leaking into ordinary app code.
- `mockdata` looks for fake-looking names, lorem/test constants, and large inline fixture data in production paths while ignoring common test and fixture locations.

Analyzers are conservative by default and do not execute project code.

## CI

```sh
jscn check --select complexity,deps --max-complexity 20 --max-cycles 0 src
```

Exit codes: `0` clean, `1` quality issues, `2` analysis/config/input failure.

See `docs/` for configuration, analyzers, reporters, MCP, and exit-code references.
