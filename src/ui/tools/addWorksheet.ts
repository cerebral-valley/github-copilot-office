import type { Tool } from "@github/copilot-sdk";

export const addWorksheet: Tool = {
  name: "add_worksheet",
  description: "Add a new worksheet to the workbook. Optionally provide a sheet name and position (1-based).",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Optional name for the new worksheet. If omitted, Excel assigns a default name.",
      },
      position: {
        type: "number",
        description: "Optional 1-based position to insert the sheet (1 = first). Defaults to the end.",
      },
    },
  },
  handler: async ({ arguments: args }) => {
    const { name, position } = args as { name?: string; position?: number };

    try {
      return await Excel.run(async (context) => {
        const workbook = context.workbook;

        if (name && name.trim().length === 0) {
          return {
            textResultForLlm: "Sheet name cannot be empty.",
            resultType: "failure",
            error: "Empty sheet name",
            toolTelemetry: {},
          };
        }

        if (name) {
          const existing = workbook.worksheets.getItemOrNullObject(name);
          existing.load("name");
          await context.sync();
          if (!existing.isNullObject) {
            return {
              textResultForLlm: `A worksheet named "${name}" already exists.`,
              resultType: "failure",
              error: "Worksheet already exists",
              toolTelemetry: {},
            };
          }
        }

        const worksheet = workbook.worksheets.add(name);

        if (typeof position === "number" && Number.isFinite(position)) {
          const zeroBased = Math.max(0, Math.floor(position) - 1);
          worksheet.position = zeroBased;
        }

        worksheet.load(["name", "position"]);
        await context.sync();

        return `Added worksheet "${worksheet.name}" at position ${worksheet.position + 1}.`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
