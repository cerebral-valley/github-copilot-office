/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Copilot Session - represents a single conversation session with the CLI
 */

import type { MessageConnection } from "vscode-jsonrpc/node";
import type { MessageOptions, SessionEvent, SessionEventHandler, Tool, ToolHandler } from "./types.js";

export class CopilotSession {
    private eventHandlers: Set<SessionEventHandler> = new Set();
    private toolHandlers: Map<string, ToolHandler> = new Map();

    constructor(
        public readonly sessionId: string,
        private connection: MessageConnection,
    ) {}

    /**
     * Send a message to this session
     */
    async send(options: MessageOptions): Promise<string> {
        const response = await this.connection.sendRequest("session.send", {
            sessionId: this.sessionId,
            prompt: options.prompt,
            attachments: options.attachments,
            mode: options.mode,
        });

        return (response as { messageId: string }).messageId;
    }

    /**
     * Subscribe to events from this session
     * @returns Unsubscribe function
     */
    on(handler: SessionEventHandler): () => void {
        this.eventHandlers.add(handler);
        return () => {
            this.eventHandlers.delete(handler);
        };
    }

    /**
     * Internal: dispatch an event to all handlers
     */
    _dispatchEvent(event: SessionEvent): void {
        for (const handler of this.eventHandlers) {
            try {
                handler(event);
            } catch (_error) {
                // Handler error
            }
        }
    }

    registerTools(tools?: Tool[]): void {
        this.toolHandlers.clear();
        if (!tools) {
            return;
        }

        for (const tool of tools) {
            this.toolHandlers.set(tool.name, tool.handler);
        }
    }

    getToolHandler(name: string): ToolHandler | undefined {
        return this.toolHandlers.get(name);
    }

    /**
     * Get all events/messages from this session
     */
    async getMessages(): Promise<SessionEvent[]> {
        const response = await this.connection.sendRequest("session.getMessages", {
            sessionId: this.sessionId,
        });

        return (response as { events: SessionEvent[] }).events;
    }

    /**
     * Destroy this session and free resources
     */
    async destroy(): Promise<void> {
        await this.connection.sendRequest("session.destroy", {
            sessionId: this.sessionId,
        });
        this.eventHandlers.clear();
        this.toolHandlers.clear();
    }
}
