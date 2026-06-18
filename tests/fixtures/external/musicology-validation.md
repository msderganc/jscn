# Musicology External Validation Fixture Record

This file records the read-only external validation target used for Task 26.

- Target: `/mnt/h/code/musicology`
- Built CLI: `/mnt/h/code/jscn/dist/cli/main.js`
- Outputs: `/tmp/jscn-musicology-*`
- Target writes: none by `jscn`; report artifacts were written under `/tmp`
- Result: default analyze/check/report generation and full-selector analyzer smoke completed successfully
- Manual accuracy baseline before analyzer fixes:
  - `deadcode`: 46 warnings; JSX component references caused most false positives.
  - `di`: 62 warnings; all inspected warnings were ordinary `.get()` calls, not container lookups.
  - `mockdata`: 1 warning under `__tests__`, a false positive.
  - `cohesion`: 15 warnings; mostly one-method error classes or React component classes.
  - `coupling`: 3 warnings; manually credible high fan-out modules.
- Expected post-fix direction:
  - DI and mock-data false positives should drop to zero for the inspected cases.
  - Dead-code warnings should no longer include local JSX components referenced by tags.
  - Cohesion should suppress low-signal error/component/one-method classes.
  - Coupling warnings should remain unless thresholds change.
- Post-fix validation on 2026-06-18:
  - Command: `node /mnt/h/code/jscn/dist/cli/main.js analyze --select complexity,deps,deadcode,clones,coupling,cohesion,architecture,di,mockdata --output /tmp/jscn-musicology-fixed.json /mnt/h/code/musicology`
  - Files: 378 analyzed, 0 skipped.
  - Issues: 4 warnings, 0 errors.
  - `deadcode`: 0 warnings.
  - `di`: 0 warnings.
  - `mockdata`: 0 warnings.
  - `cohesion`: 0 warnings.
  - `clones`: 1 warning, a remaining `source-duplicate` group across admin/session UI files.
  - `coupling`: 3 warnings, the manually credible fan-out findings for `src/app/page.tsx`, `src/lib/practice/renderer-registry.ts`, and `src/server/actions/quiz.ts`.

See `.forge/memory/musicology-validation.md` for detailed command evidence and the `.beads/dolt` runtime-state manifest exception.
