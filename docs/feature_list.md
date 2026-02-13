# Feature List

## TODO

- **Cross-host tool safety (MANDATORY)**: Enforce that files imported by `src/ui/tools/index.ts` never reference `Excel.*`, `Word.*`, or `PowerPoint.*` at module top level. Keep Office enum/object access inside tool `handler` runtime paths (inside `Excel.run` / `Word.run` / `PowerPoint.run`) to prevent cross-host add-in startup crashes.

- **Per-workbook session storage**: Persist chat sessions at a location scoped to each workbook/document/presentation so that when a specific file is reopened, only its associated chat sessions appear. Applies to **Excel, Word, and PowerPoint**.
- **Excel: Stock + financial statements data**: Add a feature (tool) to retrieve stock data and financial statement data for use in Excel workflows.

