/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Type definitions for the Copilot SDK
 */

/**
 * Session event from the CLI
 * This is passed through from the server's session events
 */
export type SessionEvent = {
    type: string;
    data: unknown;
    id: string;
    timestamp: string;
    parentId?: string;
    ephemeral?: boolean;
};

/**
 * Options for creating a CopilotClient
 */
export interface CopilotClientOptions {
    /**
     * Path to the Copilot CLI executable
     * @default "copilot" (searches PATH)
     */
    cliPath?: string;

    /**
     * Extra arguments to pass to the CLI executable (inserted before SDK-managed args)
     */
    cliArgs?: string[];

    /**
     * Working directory for the CLI process
     * If not set, inherits the current process's working directory
     */
    cwd?: string;

    /**
     * Port for the CLI server (TCP mode only)
     * @default 0 (random available port)
     */
    port?: number;

    /**
     * Use stdio transport instead of TCP
     * When true, communicates with CLI via stdin/stdout pipes
     * @default true
     */
    useStdio?: boolean;

    /**
     * Log level for the CLI server
     */
    logLevel?: "none" | "error" | "warning" | "info" | "debug" | "all";

    /**
     * Auto-start the CLI server on first use
     * @default true
     */
    autoStart?: boolean;

    /**
     * Auto-restart the CLI server if it crashes
     * @default true
     */
    autoRestart?: boolean;
}

/**
 * Configuration for creating a session
 */
export type ToolResultType = "success" | "failure" | "rejected" | "denied";

export type ToolBinaryResult = {
    data: string;
    mimeType: string;
    type: string;
    description?: string;
};

export type ToolResultObject = {
    textResultForLlm: string;
    binaryResultsForLlm?: ToolBinaryResult[];
    resultType: ToolResultType;
    error?: string;
    sessionLog?: string;
    toolTelemetry?: Record<string, unknown>;
};

export type ToolResult = string | ToolResultObject;

export interface ToolInvocation {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    arguments: unknown;
}

export type ToolHandler = (invocation: ToolInvocation) => Promise<ToolResult> | ToolResult;

export interface Tool {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
    handler: ToolHandler;
}

export interface ToolCallRequestPayload {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    arguments: unknown;
}

export interface ToolCallResponsePayload {
    result: ToolResult;
}

export interface SessionConfig {
    /**
     * Optional custom session ID
     * If not provided, server will generate one
     */
    sessionId?: string;

    /**
     * Model to use for this session
     */
    model?: "gpt-5" | "claude-sonnet-4" | "claude-sonnet-4.5" | "claude-haiku-4.5";

    /**
     * Tools exposed to the CLI server
     */
    tools?: Tool[];
}

/**
 * Options for sending a message to a session
 */
export interface MessageOptions {
    /**
     * The prompt/message to send
     */
    prompt: string;

    /**
     * File or directory attachments
     */
    attachments?: Array<{
        type: "file" | "directory";
        path: string;
        displayName?: string;
    }>;

    /**
     * Message delivery mode
     * - "enqueue": Add to queue (default)
     * - "immediate": Send immediately
     */
    mode?: "enqueue" | "immediate";
}

/**
 * Event handler callback type
 */
export type SessionEventHandler = (event: SessionEvent) => void;

/**
 * Connection state
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
