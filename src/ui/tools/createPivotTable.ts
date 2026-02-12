import type { Tool } from "@github/copilot-sdk";

const aggregationMap: Record<string, Excel.AggregationFunction> = {
  sum: Excel.AggregationFunction.sum,
  count: Excel.AggregationFunction.count,
  average: Excel.AggregationFunction.average,
  max: Excel.AggregationFunction.max,
  min: Excel.AggregationFunction.min,
};

export const createPivotTable: Tool = {
  name: "create_pivot_table",
  description: `Create a pivot table from a source range.

Parameters:
- sourceRange: Source data range (e.g., "A1:D100")
- destinationCell: Top-left cell for the pivot table (e.g., "F1")
- sheetName: Optional worksheet name. Defaults to active sheet.
- name: Optional pivot table name.
- rows: Array of field names for row hierarchies
- columns: Array of field names for column hierarchies
- values: Array of { field, summarizeBy } for data hierarchies

summarizeBy supports: sum, count, average, max, min
`,
  parameters: {
    type: "object",
    properties: {
      sourceRange: {
        type: "string",
        description: "Source data range, including headers (e.g., 'A1:D100').",
      },
      destinationCell: {
        type: "string",
        description: "Top-left destination cell for the pivot table (e.g., 'F1').",
      },
      sheetName: {
        type: "string",
        description: "Optional worksheet name. Defaults to active sheet.",
      },
      name: {
        type: "string",
        description: "Optional pivot table name. Defaults to 'PivotTable1' or next available.",
      },
      rows: {
        type: "array",
        items: { type: "string" },
        description: "Field names to add as row hierarchies.",
      },
      columns: {
        type: "array",
        items: { type: "string" },
        description: "Field names to add as column hierarchies.",
      },
      values: {
        type: "array",
        description: "Value fields with optional summarizeBy.",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            summarizeBy: { type: "string", enum: ["sum", "count", "average", "max", "min"] },
          },
          required: ["field"],
        },
      },
    },
    required: ["sourceRange", "destinationCell"],
  },
  handler: async (input) => {
    const { sourceRange, destinationCell, sheetName, name, rows, columns, values } = (input as { arguments: any }).arguments as {
      sourceRange: string;
      destinationCell: string;
      sheetName?: string;
      name?: string;
      rows?: string[];
      columns?: string[];
      values?: { field: string; summarizeBy?: string }[];
    };

    try {
      return await Excel.run(async (context) => {
        const sheet = sheetName
          ? context.workbook.worksheets.getItem(sheetName)
          : context.workbook.worksheets.getActiveWorksheet();

        sheet.load("name");

        const source = sheet.getRange(sourceRange);
        const destination = sheet.getRange(destinationCell);

        const pivotName = name || `PivotTable_${Date.now()}`;
        const existing = sheet.pivotTables.getItemOrNullObject(pivotName);
        existing.load("name");
        await context.sync();

        if (!existing.isNullObject) {
          return {
            textResultForLlm: `A pivot table named "${pivotName}" already exists on "${sheet.name}".`,
            resultType: "failure",
            error: "Pivot table already exists",
            toolTelemetry: {},
          };
        }

        const pivot = sheet.pivotTables.add(pivotName, source, destination);

        if (rows && rows.length > 0) {
          for (const field of rows) {
            pivot.rowHierarchies.add(pivot.hierarchies.getItem(field));
          }
        }

        if (columns && columns.length > 0) {
          for (const field of columns) {
            pivot.columnHierarchies.add(pivot.hierarchies.getItem(field));
          }
        }

        if (values && values.length > 0) {
          for (const valueField of values) {
            const dataHierarchy = pivot.dataHierarchies.add(pivot.hierarchies.getItem(valueField.field));
            if (valueField.summarizeBy) {
              const agg = aggregationMap[valueField.summarizeBy.toLowerCase()];
              if (agg) {
                dataHierarchy.summarizeBy = agg;
              }
            }
          }
        }

        await context.sync();

        return `Created pivot table "${pivotName}" on "${sheet.name}" using source ${sourceRange} at ${destinationCell}.`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
