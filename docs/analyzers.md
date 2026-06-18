# Analyzers

- `complexity`: function complexity and threshold issues.
- `deps`: import/export/require/dynamic dependency graph and cycles.
- `deadcode`: unreachable statements and conservative unused local declarations. JSX component tags count as references, exported declarations are not reported by default, and underscore-prefixed locals are ignored unless `[dead_code] report_intentional_unused = true`.
- `clones`: normalized duplicate source chunks. Import and test boilerplate groups stay in `analyses.clones.groups`, but they are not emitted as issues unless `[clones] include_test_boilerplate = true`.
- `coupling` / `cbo`: module fan-in and fan-out.
- `cohesion` / `lcom`: conservative class cohesion score based on method pairs and shared `this.field` usage. Error classes, React component subclasses, one-method classes, and classes with no fields are suppressed as low-signal cases.
- `architecture`: default domain-to-infrastructure boundary check.
- `di`: configured container/service-locator lookup outside composition roots. Defaults flag receivers such as `container` and `serviceLocator` with methods such as `get`, `resolve`, and `lookup`; ordinary `Map#get` and `URLSearchParams#get` are ignored.
- `mockdata`: mock-looking literals in production paths. `tests/**`, `**/__tests__/**`, `**/__fixtures__/**`, `*.test.*`, and `*.spec.*` paths are ignored.

Analyzers are conservative by default and do not execute project code.
