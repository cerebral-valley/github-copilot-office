/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Async generator-based query function
 *
 * Provides streaming access to session events.
 */

import EventEmitter, { on } from "node:events";
import { CopilotClient } from "./client.js";
import { CopilotSession } from "./session.js";
import type { MessageOptions, SessionEvent, Tool } from "./types.js";

type SessionEventIterator = NodeJS.AsyncIterator<[SessionEvent]>;

/**
 * Options for the query() function
 */
export interface QueryOptions {
    /**
     * The prompt/question to send
     */
    prompt: string;

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
     * Working directory for the CLI process
     */
    cwd?: string;

    /**
     * Log level for the CLI
     */
    logLevel?: "none" | "error" | "warning" | "info" | "debug" | "all";

    /**
     * File or directory attachments
     */
    attachments?: MessageOptions["attachments"];

    /**
     * Maximum time to wait for completion (ms)
     * @default 60000 (60 seconds)
     */
    timeout?: number;

    /**
     * Whether to yield ephemeral events
     * @default true (changed to true so streaming message chunks are visible)
     */
    includeEphemeral?: boolean;

    /**
     * Tools to expose to the CLI for cross-process tool calls
     */
    tools?: Tool[];
}

/**
 * Query the Copilot CLI and stream events as they occur.
 *
 * This async generator function yields events in real-time as the CLI processes
 * the prompt. It automatically handles lifecycle (start/stop) and waits for
 * turn completion.
 *
 * @example
 * ```typescript
 * for await (const event of query({ prompt: "What is 2+2?" })) {
 *   if (event.type === "assistant.message") {
 *     console.log("Answer:", event.data.content);
 *   }
 *   if (event.type === "tool.execution_start") {
 *     console.log("Tool:", event.data.name);
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With file attachments
 * for await (const event of query({
 *   prompt: "Analyze this file",
 *   attachments: [{ type: "file", path: "./main.ts" }]
 * })) {
 *   console.log(event.type, event.data);
 * }
 * ```
 */
export async function* query(options: QueryOptions): AsyncGenerator<SessionEvent, void, undefined> {
    const {
        prompt,
        model,
        cliPath,
        cliArgs,
        cwd,
        logLevel = "error",
        attachments,
        timeout = 60000,
        includeEphemeral = true, // Default to true for streaming chunks
        tools,
    } = options;

    const client = new CopilotClient({
        cliPath,
        cliArgs,
        cwd,
        logLevel,
    });

    // Detect timeouts
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), timeout);

    let session: CopilotSession | undefined;
    let turnFinished = false;

    try {
        // Start client and create session
        await client.start();
        session = await client.createSession({ model, tools });

        // Use EventEmitter to convert session events to async iterator
        const eventEmitter = new EventEmitter<{ data: [SessionEvent] }>();
        session.on((event) => eventEmitter.emit("data", event));
        const eventIterator = on(eventEmitter, "data", { signal: abortController.signal }) as SessionEventIterator;

        session.send({ prompt, attachments }).catch((sendError) => {
            !turnFinished && eventIterator.throw!(sendError);
        });

        for await (const events of eventIterator) {
            if (events.length !== 1) {
                // This should never happen based on how eventEmitter is defined as [SessionEvent]
                throw new Error(`Expected single event, got ${events.length}`);
            }

            // Filter ephemeral events if requested
            const event = events[0];
            if (event.ephemeral && !includeEphemeral) {
                continue;
            }

            if (event.type === "session.error") {
                throw new Error(
                    typeof event.data === "object" && event.data && "message" in event.data
                        ? String(event.data.message)
                        : "Unknown error",
                );
            }

            yield event;

            if (event.type === "session.idle") {
                await eventIterator.return!();
            }
        }
    } catch (err) {
        throw abortController.signal.aborted && err instanceof Error && err.name === "AbortError"
            ? new Error(`Query timed out after ${timeout}ms`)
            : err;
    } finally {
        turnFinished = true;
        clearTimeout(timeoutHandle);
        await session?.destroy();
        const cleanupErrors = await client.stop();
        if (cleanupErrors.length > 0) {
            yield {
                type: "error" as const,
                id: `error-${Date.now()}`,
                data: {
                    message: `Cleanup errors: ${cleanupErrors.map((e) => e.message).join("; ")}`,
                },
                timestamp: new Date().toISOString(),
            };
        }
    }
}
