# Configuration

`jscn init` writes `.jscn.toml`.

Sections:

- `[output]`: `format` (`text`, `json`, `yaml`, `csv`, `html`), `directory`.
- `[analysis]`: `recursive`, `follow_symlinks`, `include_patterns`, `exclude_patterns`, `max_file_size_kb`.
- `[complexity]`: `enabled`, `low_threshold`, `medium_threshold`, `max_complexity`, `report_unchanged`.
- `[dependencies]`: `enabled`, `include_type_only`, `include_external`, `max_cycles`.

CLI flags override matching config values where supported.
