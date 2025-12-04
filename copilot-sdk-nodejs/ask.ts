/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * High-level query helpers for the Copilot SDK
 *
 * These provide ergonomic wrappers around the lower-level Client/Session APIs.
 */

import { query } from "./query.js";
import type { MessageOptions, SessionEvent } from "./types.js";

/**
 * Options for the ask() helper function
 */
export interface AskOptions {
    /**
     * Model to use
     */
    model?: "gpt-5" | "claude-sonnet-4" | "claude-sonnet-4.5" | "claude-haiku-4.5";

    /**
     * Path to the CLI executable
     */
    cliPath?: string;

    /**
     * Extra arguments to pass to the CLI executable (before SDK-managed args)
     */
    cliArgs?: string[];

    /**
     * Log level for the CLI
     */
    logLevel?: "none" | "error" | "warning" | "info" | "debug" | "all";

    /**
     * File or directory attachments
     */
    attachments?: MessageOptions["attachments"];

    /**
     * Callback invoked for each event received
     */
    onEvent?: (event: SessionEvent) => void;

    /**
     * Maximum time to wait for completion (ms)
     * @default 60000 (60 seconds)
     */
    timeout?: number;
}

/**
 * Result from ask() function
 */
export interface AskResult {
    /**
     * The final assistant message content
     */
    content: string;

    /**
     * All events that occurred during the interaction
     */
    events: SessionEvent[];

    /**
     * Whether the interaction completed successfully
     */
    completed: boolean;

    /**
     * Error if the interaction failed
     */
    error?: Error;
}

/**
 * Simple helper to ask the Copilot CLI a question and get the response.
 *
 * This function handles all the lifecycle:
 * - Starts the CLI server
 * - Creates a session
 * - Sends the prompt
 * - Waits for completion
 * - Cleans up resources
 *
 * @example
 * ```typescript
 * const result = await ask("What is 2+2?");
 * console.log(result.content); // "4"
 * ```
 *
 * @example
 * ```typescript
 * // With event streaming
 * const result = await ask("Analyze this code", {
 *   attachments: [{ type: "file", path: "./main.ts" }],
 *   onEvent: (event) => {
 *     if (event.type === "tool.execution_start") {
 *       console.log("Using tool:", event.data.name);
 *     }
 *   }
 * });
 * ```
 */
export async function ask(prompt: string, options: AskOptions = {}): Promise<AskResult> {
    const { model, cliPath, cliArgs, logLevel = "error", attachments, onEvent, timeout = 60000 } = options;

    const events: SessionEvent[] = [];
    let finalContent = "";
    let error: Error | undefined;

    try {
        for await (const event of query({
            prompt,
            model,
            cliPath,
            cliArgs,
            logLevel,
            attachments,
            timeout,
        })) {
            events.push(event);

            // Call user's event handler if provided
            // If it throws, we'll let it bubble up to the outer catch, otherwise it will be hard to debug
            onEvent?.(event);

            // Track final assistant message
            if (event.type === "assistant.message") {
                const content =
                    typeof event.data === "object" &&
                    event.data &&
                    "content" in event.data &&
                    typeof event.data.content === "string"
                        ? event.data.content
                        : "";
                finalContent = content;
            }
        }

        return {
            content: finalContent,
            events,
            completed: true,
        };
    } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        return {
            content: finalContent,
            events,
            completed: false,
            error,
        };
    }
}
