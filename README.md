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

## CI

```sh
jscn check --select complexity,deps --max-complexity 20 --max-cycles 0 src
```

Exit codes: `0` clean, `1` quality issues, `2` analysis/config/input failure.

See `docs/` for configuration, analyzers, reporters, MCP, and exit-code references.
