# Exit Codes

- `0`: command completed with no quality issues.
- `1`: analysis completed and found quality issues.
- `2`: input, config, path-safety, parser, or fatal analysis failure.

Examples:

- Missing input path returns `2`.
- Invalid `.jscn.toml` returns `2`.
- Complexity or dependency-cycle violations in `check` return `1`.
