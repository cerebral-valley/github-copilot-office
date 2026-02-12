# Adding Excel Tools

Use this guide to add a new Excel tool following existing patterns in `src/ui/tools/`.

## Steps

1. **Choose a reference tool**
   - Pick the closest existing Excel tool (e.g., `getWorkbookInfo.ts`, `setWorkbookContent.ts`, `insertChart.ts`).

2. **Create the tool file**
   - Add a new file under `src/ui/tools/` (e.g., `addWorksheet.ts`).
   - Export a `Tool` object from `@github/copilot-sdk`.
   - Use `Excel.run` and `context.sync()` as shown in existing tools.
   - Provide clear `name`, `description`, and JSON `parameters`.
   - Return user-friendly strings on success and the standard error shape on failure.

3. **Register the tool**
   - Import the tool in `src/ui/tools/index.ts` and add it to `excelTools`.

4. **Document the tool**
   - Add a row in `TOOLS_CATALOG.md` under **Excel Tools**.

5. **Validate behavior**
   - Run `npm run dev`, open Excel, and invoke the tool via Copilot.

## Notes

- Keep parameter naming consistent with existing tools (camelCase input in the schema).
- Use `getItemOrNullObject` for safe lookups when appropriate.
- Prefer minimal changes and follow the patterns in nearby tools.
