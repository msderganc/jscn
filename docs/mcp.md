# MCP

Run:

```sh
jscn mcp
```

The server uses newline-delimited JSON-RPC over stdio. Logs and diagnostics must go to stderr.

Tools:

- `jscn_analysis`
- `jscn_complexity`
- `jscn_deps`
- `jscn_clones`
- `jscn_coupling`
- `jscn_cohesion`
- `jscn_deadcode`
- `jscn_architecture`
- `jscn_di`
- `jscn_mockdata`
- `jscn_health`

Inputs include `root`, optional `files`, and optional `configPath`. Paths are bounded to `root`.
