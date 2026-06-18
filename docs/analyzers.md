# Analyzers

- `complexity`: function complexity and threshold issues.
- `deps`: import/export/require/dynamic dependency graph and cycles.
- `deadcode`: unreachable statements and conservative unused local declarations.
- `clones`: normalized duplicate source chunks.
- `coupling` / `cbo`: module fan-in and fan-out.
- `cohesion` / `lcom`: conservative class cohesion score.
- `architecture`: default domain-to-infrastructure boundary check.
- `di`: container lookup outside composition roots.
- `mockdata`: mock-looking literals in production paths.

Analyzers are conservative by default and do not execute project code.
