import { Tool } from "../../../copilot-sdk-nodejs/types";

export const webFetch: Tool = {
  name: "web_fetch",
  description: "Fetch content from a URL (GET only). Returns the response text. Useful for getting web page content, API data, etc.",
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch.",
      },
    },
    required: ["url"],
  },
  handler: async ({ arguments: args }) => {
    const { url } = args as { url: string };
    
    try {
      // Use server proxy to avoid CORS
      const response = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
      
      if (!response.ok) {
        return `HTTP ${response.status}: ${response.statusText}`;
      }
      
      const text = await response.text();
      // Truncate very long responses
      if (text.length > 50000) {
        return text.slice(0, 50000) + "\n\n[Truncated - response exceeded 50KB]";
      }
      return text;
    } catch (e: any) {
      return { textResultForLlm: e.message, resultType: "failure", error: e.message, toolTelemetry: {} };
    }
  },
};
