# Adding PowerPoint Tools

Use this guide to add a new PowerPoint tool following existing patterns in `src/ui/tools/`.

## Steps

1. **Choose a reference tool**
   - Pick the closest existing PowerPoint tool (e.g., `setPresentationContent.ts`, `updateSlideShape.ts`, `addSlideFromCode.ts`).

2. **Create the tool file**
   - Add a new file under `src/ui/tools/` (e.g., `reorderSlides.ts`).
   - Export a `Tool` object from `@github/copilot-sdk`.
   - Use `PowerPoint.run` and `context.sync()` following existing tools.
   - Provide clear `name`, `description`, and JSON `parameters`.
   - Return user-friendly strings on success and the standard error shape on failure.

3. **Register the tool**
   - Import the tool in `src/ui/tools/index.ts` and add it to `powerpointTools`.

4. **Document the tool**
   - Add a row in `TOOLS_CATALOG.md` under **PowerPoint Tools**.

5. **Validate behavior**
   - Run `npm run dev`, open PowerPoint, and invoke the tool via Copilot.

## Notes

- Keep parameters consistent with existing tools (camelCase input in the schema).
- Prefer minimal changes and mirror patterns in similar tools.
