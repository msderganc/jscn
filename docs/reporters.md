# Reporters

Formats:

- `text`: human console summary.
- `json`: canonical `AnalysisResult`.
- `yaml`: canonical result rendered as YAML-like text.
- `csv`: flattened issue rows with stable headers.
- `html`: escaped standalone report with a restrictive CSP.

Reporters consume `AnalysisResult`; they do not inspect files or run analyzers.
