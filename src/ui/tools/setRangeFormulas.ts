import type { Tool } from "@github/copilot-sdk";

export const setRangeFormulas: Tool = {
  name: "set_range_formulas",
  description: "Write formulas to a specific range in an Excel worksheet. Provide a 2D array of formulas. If no sheet name is provided, writes to the active sheet.",
  parameters: {
    type: "object",
    properties: {
      sheetName: {
        type: "string",
        description: "Optional name of the worksheet to write to. If not provided, writes to the active sheet.",
      },
      startCell: {
        type: "string",
        description: "The starting cell address (e.g., 'A1', 'B5'). Formulas will be written starting from this cell.",
      },
      formulas: {
        type: "array",
        description: "2D array of formulas to write. Each inner array represents a row. Example: [['=SUM(A1:A10)'], ['=AVERAGE(B1:B10)']].",
        items: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
    required: ["startCell", "formulas"],
  },
  handler: async ({ arguments: args }) => {
    const { sheetName, startCell, formulas } = args as {
      sheetName?: string;
      startCell: string;
      formulas: string[][];
    };

    try {
      return await Excel.run(async (context) => {
        let worksheet: Excel.Worksheet;

        if (sheetName) {
          worksheet = context.workbook.worksheets.getItem(sheetName);
        } else {
          worksheet = context.workbook.worksheets.getActiveWorksheet();
        }

        worksheet.load("name");

        const rowCount = formulas.length;
        const colCount = formulas[0]?.length || 0;

        if (rowCount === 0 || colCount === 0) {
          return {
            textResultForLlm: "No formulas provided to write.",
            resultType: "failure",
            error: "Empty formulas array",
            toolTelemetry: {},
          };
        }

        const startRange = worksheet.getRange(startCell);
        const targetRange = startRange.getResizedRange(rowCount - 1, colCount - 1);

        targetRange.formulas = formulas;
        await context.sync();

        return `Successfully wrote ${rowCount} rows and ${colCount} columns of formulas to ${worksheet.name} starting at ${startCell}.`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
