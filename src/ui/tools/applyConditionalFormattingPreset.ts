import type { Tool } from "@github/copilot-sdk";

const presetDescriptions = [
  "greater_than",
  "less_than",
  "between",
  "top_n",
  "color_scale",
] as const;

type Preset = (typeof presetDescriptions)[number];

export const applyConditionalFormattingPreset: Tool = {
  name: "apply_conditional_formatting_preset",
  description: `Apply a conditional formatting preset to a range in Excel.

Presets: ${presetDescriptions.join(", ")}
Parameters:
- range: Target range (e.g., "A1:D10")
- sheetName: Optional worksheet name. Defaults to active sheet.
- preset: One of the preset names
- threshold: Used by greater_than/less_than (number)
- min: Used by between (number)
- max: Used by between (number)
- topN: Used by top_n (number)
- color1/color2/color3: Optional hex colors for color_scale (without #)
`,
  parameters: {
    type: "object",
    properties: {
      range: {
        type: "string",
        description: "Target range to format (e.g., 'A1:D10').",
      },
      sheetName: {
        type: "string",
        description: "Optional worksheet name. Defaults to active sheet.",
      },
      preset: {
        type: "string",
        enum: presetDescriptions as unknown as string[],
        description: "Conditional formatting preset to apply.",
      },
      threshold: {
        type: "number",
        description: "Threshold for greater_than/less_than presets.",
      },
      min: {
        type: "number",
        description: "Minimum value for between preset.",
      },
      max: {
        type: "number",
        description: "Maximum value for between preset.",
      },
      topN: {
        type: "number",
        description: "Top N for top_n preset.",
      },
      color1: {
        type: "string",
        description: "Optional low color for color_scale (hex without #).",
      },
      color2: {
        type: "string",
        description: "Optional mid color for color_scale (hex without #).",
      },
      color3: {
        type: "string",
        description: "Optional high color for color_scale (hex without #).",
      },
    },
    required: ["range", "preset"],
  },
  handler: async ({ arguments: args }) => {
    const { range, sheetName, preset, threshold, min, max, topN, color1, color2, color3 } = args as {
      range: string;
      sheetName?: string;
      preset: Preset;
      threshold?: number;
      min?: number;
      max?: number;
      topN?: number;
      color1?: string;
      color2?: string;
      color3?: string;
    };

    try {
      return await Excel.run(async (context) => {
        const sheet = sheetName
          ? context.workbook.worksheets.getItem(sheetName)
          : context.workbook.worksheets.getActiveWorksheet();

        sheet.load("name");
        const targetRange = sheet.getRange(range);
        targetRange.load("address");
        await context.sync();

        switch (preset) {
          case "greater_than": {
            if (threshold === undefined) {
              return { textResultForLlm: "threshold is required for greater_than.", resultType: "failure", error: "Missing threshold", toolTelemetry: {} };
            }
            const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
            cf.cellValue.rule = {
              formula1: String(threshold),
              operator: Excel.ConditionalCellValueOperator.greaterThan,
            };
            cf.cellValue.format.fill.color = "#C6EFCE";
            cf.cellValue.format.font.color = "#006100";
            break;
          }
          case "less_than": {
            if (threshold === undefined) {
              return { textResultForLlm: "threshold is required for less_than.", resultType: "failure", error: "Missing threshold", toolTelemetry: {} };
            }
            const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
            cf.cellValue.rule = {
              formula1: String(threshold),
              operator: Excel.ConditionalCellValueOperator.lessThan,
            };
            cf.cellValue.format.fill.color = "#FFC7CE";
            cf.cellValue.format.font.color = "#9C0006";
            break;
          }
          case "between": {
            if (min === undefined || max === undefined) {
              return { textResultForLlm: "min and max are required for between.", resultType: "failure", error: "Missing range", toolTelemetry: {} };
            }
            const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.cellValue);
            cf.cellValue.rule = {
              formula1: String(min),
              formula2: String(max),
              operator: Excel.ConditionalCellValueOperator.between,
            };
            cf.cellValue.format.fill.color = "#FFEB9C";
            cf.cellValue.format.font.color = "#9C6500";
            break;
          }
          case "top_n": {
            const rank = topN ?? 10;
            const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.topBottom);
            cf.topBottom.rule = {
              rank,
              type: Excel.ConditionalTopBottomCriterionType.topItems,
            };
            cf.topBottom.format.fill.color = "#BDD7EE";
            cf.topBottom.format.font.color = "#1F4E79";
            break;
          }
          case "color_scale": {
            const low = color1 ? `#${color1.replace("#", "")}` : "#F8696B";
            const mid = color2 ? `#${color2.replace("#", "")}` : "#FFEB84";
            const high = color3 ? `#${color3.replace("#", "")}` : "#63BE7B";

            const cf = targetRange.conditionalFormats.add(Excel.ConditionalFormatType.colorScale);
            cf.colorScale.criteria = {
              minimum: { type: Excel.ConditionalFormatColorCriterionType.lowestValue, color: low },
              midpoint: { type: Excel.ConditionalFormatColorCriterionType.percentile, formula: "50", color: mid },
              maximum: { type: Excel.ConditionalFormatColorCriterionType.highestValue, color: high },
            };
            break;
          }
          default:
            return { textResultForLlm: `Unsupported preset: ${preset}`, resultType: "failure", error: "Unsupported preset", toolTelemetry: {} };
        }

        await context.sync();
        return `Applied "${preset}" conditional formatting to ${targetRange.address} in "${sheet.name}".`;
      });
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
