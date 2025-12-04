/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Copilot SDK - TypeScript/Node.js Client
 *
 * JSON-RPC based SDK for programmatic control of GitHub Copilot CLI
 */

export { CopilotClient } from "./client.js";
export { CopilotSession } from "./session.js";
export { ask } from "./ask.js";
export { query } from "./query.js";
export type {
    CopilotClientOptions,
    SessionConfig,
    SessionEventHandler,
    MessageOptions,
    ConnectionState,
    Tool,
    ToolHandler,
    ToolInvocation,
    ToolResult,
} from "./types.js";
export type { AskOptions, AskResult } from "./ask.js";
export type { QueryOptions } from "./query.js";
