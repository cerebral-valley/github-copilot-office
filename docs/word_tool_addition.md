# Adding Word Tools

Use this guide to add a new Word tool following existing patterns in `src/ui/tools/`.

## Steps

1. **Choose a reference tool**
   - Pick the closest existing Word tool (e.g., `insertContentAtSelection.ts`, `applyStyleToSelection.ts`, `insertTable.ts`).

2. **Create the tool file**
   - Add a new file under `src/ui/tools/` (e.g., `insertImage.ts`).
   - Export a `Tool` object from `@github/copilot-sdk`.
   - Use `Word.run` and `context.sync()` following existing tools.
   - Provide clear `name`, `description`, and JSON `parameters`.
   - Return user-friendly strings on success and the standard error shape on failure.

3. **Register the tool**
   - Import the tool in `src/ui/tools/index.ts` and add it to `wordTools`.

4. **Document the tool**
   - Add a row in `TOOLS_CATALOG.md` under **Word Tools**.

5. **Validate behavior**
   - Run `npm run dev`, open Word, and invoke the tool via Copilot.

## Notes

- Keep parameters consistent with existing tools (camelCase input in the schema).
- Prefer minimal changes and mirror patterns in similar tools.
