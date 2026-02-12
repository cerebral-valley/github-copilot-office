# Versions Reference

This file tracks the repository's released and checkpointed versions for quick rollback/reference.

## v0.0.2

- Switched GitHub Packages authentication to `NPM_TOKEN` for package workflows.
- Stabilized package publishing/auth flow for CI.

## v0.0.3

- Added `TOOLS_CATALOG.md` and reorganized documentation.
- Expanded foundational tool docs and project guidance.

## v1.0.0

- Baseline 1.x release line established for Office add-in experience.
- Introduced stable core app structure for Word/PowerPoint/Excel Copilot pane.

## v1.0.1

- Aligned local HTTPS/Vite runtime porting to `52390` for manifest/server consistency.
- Fixed Excel sideload issues by removing problematic OneNote host manifest entries.
- Added Excel tooling enhancements:
  - `add_worksheet`
  - `set_range_formulas`
  - `apply_conditional_formatting_preset`
  - `create_pivot_table`
- Added tool authoring guides under `docs/` for Excel, Word, and PowerPoint.
- Added model selector support for `GPT 4.1`.

## v1.0.2 (checkpoint)

- Pre-fix backup checkpoint before Word/PowerPoint blank-pane runtime fix.
- Created to provide a safe restore point on `origin/main`.
