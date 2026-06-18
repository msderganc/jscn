# Configuration

`jscn init` writes `.jscn.toml`.

Sections:

- `[output]`: `format` (`text`, `json`, `yaml`, `csv`, `html`), `directory`.
- `[analysis]`: `recursive`, `follow_symlinks`, `include_patterns`, `exclude_patterns`, `max_file_size_kb`.
- `[complexity]`: `enabled`, `low_threshold`, `medium_threshold`, `max_complexity`, `report_unchanged`.
- `[dependencies]`: `enabled`, `include_type_only`, `include_external`, `max_cycles`.
- `[dead_code]`: `report_intentional_unused`.
- `[di]`: `container_names`, `lookup_methods`, `composition_roots`.
- `[clones]`: `include_test_boilerplate`, `min_normalized_chars`, `min_non_import_chars`.

CLI flags override matching config values where supported.
