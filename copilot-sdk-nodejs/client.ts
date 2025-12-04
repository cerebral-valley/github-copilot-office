/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------------------------------------------*/

/**
 * Copilot CLI SDK Client - Main entry point
 *
 * Manages the CLI server process and provides session management
 */

import { spawn, type ChildProcess } from "node:child_process";
import { Socket } from "node:net";
import {
    createMessageConnection,
    MessageConnection,
    StreamMessageReader,
    StreamMessageWriter,
} from "vscode-jsonrpc/node";
import { CopilotSession } from "./session.js";
import type {
    ConnectionState,
    CopilotClientOptions,
    SessionConfig,
    SessionEvent,
    ToolCallRequestPayload,
    ToolCallResponsePayload,
    ToolHandler,
    ToolResult,
} from "./types.js";

export class CopilotClient {
    private cliProcess: ChildProcess | null = null;
    private connection: MessageConnection | null = null;
    private socket: Socket | null = null;
    private actualPort: number | null = null;
    private state: ConnectionState = "disconnected";
    private sessions: Map<string, CopilotSession> = new Map();
    private options: Required<CopilotClientOptions>;

    constructor(options: CopilotClientOptions = {}) {
        this.options = {
            cliPath: options.cliPath || "copilot",
            cliArgs: options.cliArgs ?? [],
            cwd: options.cwd ?? process.cwd(),
            port: options.port || 0,
            useStdio: options.useStdio ?? true, // Default to stdio
            logLevel: options.logLevel || "info",
            autoStart: options.autoStart ?? true,
            autoRestart: options.autoRestart ?? true,
        };
    }

    /**
     * Start the CLI server and establish connection
     */
    async start(): Promise<void> {
        if (this.state === "connected") {
            return;
        }

        this.state = "connecting";

        try {
            // Start CLI server process
            await this.startCLIServer();

            // Connect to the server
            await this.connectToServer();

            this.state = "connected";
        } catch (error) {
            this.state = "error";
            throw error;
        }
    }

    /**
     * Stop the CLI server and close all sessions
     * Returns array of errors encountered during cleanup (empty if all succeeded)
     */
    async stop(): Promise<Error[]> {
        const errors: Error[] = [];

        // Destroy all active sessions with retry logic
        for (const session of this.sessions.values()) {
            const sessionId = session.sessionId;
            let lastError: Error | null = null;

            // Try up to 3 times with exponential backoff
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await session.destroy();
                    lastError = null;
                    break; // Success
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    if (attempt < 3) {
                        // Exponential backoff: 100ms, 200ms
                        const delay = 100 * Math.pow(2, attempt - 1);
                        await new Promise((resolve) => setTimeout(resolve, delay));
                    }
                }
            }

            if (lastError) {
                errors.push(new Error(`Failed to destroy session ${sessionId} after 3 attempts: ${lastError.message}`));
            }
        }
        this.sessions.clear();

        // Close connection
        if (this.connection) {
            try {
                this.connection.dispose();
            } catch (error) {
                errors.push(
                    new Error(
                        `Failed to dispose connection: ${error instanceof Error ? error.message : String(error)}`,
                    ),
                );
            }
            this.connection = null;
        }

        if (this.socket) {
            try {
                this.socket.end();
            } catch (error) {
                errors.push(
                    new Error(`Failed to close socket: ${error instanceof Error ? error.message : String(error)}`),
                );
            }
            this.socket = null;
        }

        // Kill CLI process
        if (this.cliProcess) {
            try {
                this.cliProcess.kill();
            } catch (error) {
                errors.push(
                    new Error(`Failed to kill CLI process: ${error instanceof Error ? error.message : String(error)}`),
                );
            }
            this.cliProcess = null;
        }

        this.state = "disconnected";
        this.actualPort = null;

        return errors;
    }

    /**
     * Force stop the CLI server without graceful cleanup
     * Use when normal stop() fails or takes too long
     */
    async forceStop(): Promise<void> {
        // Clear sessions immediately without trying to destroy them
        this.sessions.clear();

        // Force close connection
        if (this.connection) {
            try {
                this.connection.dispose();
            } catch {
                // Ignore errors during force stop
            }
            this.connection = null;
        }

        if (this.socket) {
            try {
                this.socket.destroy(); // destroy() is more forceful than end()
            } catch {
                // Ignore errors
            }
            this.socket = null;
        }

        // Force kill CLI process
        if (this.cliProcess) {
            try {
                this.cliProcess.kill("SIGKILL");
            } catch {
                // Ignore errors
            }
            this.cliProcess = null;
        }

        this.state = "disconnected";
        this.actualPort = null;
    }

    /**
     * Create a new session
     */
    async createSession(config: SessionConfig = {}): Promise<CopilotSession> {
        if (!this.connection) {
            if (this.options.autoStart) {
                await this.start();
            } else {
                throw new Error("Client not connected. Call start() first.");
            }
        }

        const response = await this.connection!.sendRequest("session.create", {
            model: config.model,
            sessionId: config.sessionId,
            tools: config.tools?.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            })),
        });

        const sessionId = (response as { sessionId: string }).sessionId;
        const session = new CopilotSession(sessionId, this.connection!);
        session.registerTools(config.tools);
        this.sessions.set(sessionId, session);

        return session;
    }

    /**
     * Get connection state
     */
    getState(): ConnectionState {
        return this.state;
    }

    /**
     * Ping the server
     */
    async ping(message?: string): Promise<{ message: string; timestamp: number }> {
        if (!this.connection) {
            throw new Error("Client not connected");
        }

        const result = await this.connection.sendRequest("ping", { message });
        return result as {
            message: string;
            timestamp: number;
        };
    }

    /**
     * Start the CLI server process
     */
    private async startCLIServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            const args = [...this.options.cliArgs, "--server", "--log-level", this.options.logLevel];

            // Choose transport mode
            if (this.options.useStdio) {
                args.push("--stdio");
            } else if (this.options.port > 0) {
                args.push("--port", this.options.port.toString());
            }

            this.cliProcess = spawn(this.options.cliPath, args, {
                stdio: this.options.useStdio ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
                cwd: this.options.cwd,
                env: this.options.useStdio
                    ? {
                          ...process.env,
                          // Suppress debug/trace output that might pollute stdout
                          NODE_DEBUG: "",
                      }
                    : process.env,
            });

            let stdout = "";
            let resolved = false;

            // For stdio mode, we're ready immediately after spawn
            if (this.options.useStdio) {
                resolved = true;
                resolve();
            } else {
                // For TCP mode, wait for port announcement
                this.cliProcess.stdout?.on("data", (data: Buffer) => {
                    stdout += data.toString();
                    const match = stdout.match(/listening on port (\d+)/i);
                    if (match && !resolved) {
                        this.actualPort = parseInt(match[1], 10);
                        resolved = true;
                        resolve();
                    }
                });
            }

            this.cliProcess.stderr?.on("data", (_data: Buffer) => {
                // CLI stderr output
            });

            this.cliProcess.on("error", (error) => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error(`Failed to start CLI server: ${error.message}`));
                }
            });

            this.cliProcess.on("exit", (code) => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error(`CLI server exited with code ${code}`));
                } else if (this.options.autoRestart && this.state === "connected") {
                    void this.reconnect();
                }
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    reject(new Error("Timeout waiting for CLI server to start"));
                }
            }, 10000);
        });
    }

    /**
     * Connect to the CLI server (via socket or stdio)
     */
    private async connectToServer(): Promise<void> {
        if (this.options.useStdio) {
            return this.connectViaStdio();
        } else {
            return this.connectViaTcp();
        }
    }

    /**
     * Connect via stdio pipes
     */
    private async connectViaStdio(): Promise<void> {
        if (!this.cliProcess) {
            throw new Error("CLI process not started");
        }

        // Create JSON-RPC connection over stdin/stdout
        this.connection = createMessageConnection(
            new StreamMessageReader(this.cliProcess.stdout!),
            new StreamMessageWriter(this.cliProcess.stdin!),
        );

        this.attachConnectionHandlers();
        this.connection.listen();
    }

    /**
     * Connect to the CLI server via TCP socket
     */
    private async connectViaTcp(): Promise<void> {
        if (!this.actualPort) {
            throw new Error("Server port not available");
        }

        return new Promise((resolve, reject) => {
            this.socket = new Socket();

            this.socket.connect(this.actualPort!, "localhost", () => {
                // Create JSON-RPC connection
                this.connection = createMessageConnection(
                    new StreamMessageReader(this.socket!),
                    new StreamMessageWriter(this.socket!),
                );

                this.attachConnectionHandlers();
                this.connection.listen();
                resolve();
            });

            this.socket.on("error", (error) => {
                reject(new Error(`Failed to connect to CLI server: ${error.message}`));
            });
        });
    }

    private attachConnectionHandlers(): void {
        if (!this.connection) {
            return;
        }

        this.connection.onNotification("session.event", (notification: unknown) => {
            this.handleSessionEventNotification(notification);
        });

        this.connection.onRequest(
            "tool.call",
            async (params: ToolCallRequestPayload): Promise<ToolCallResponsePayload> =>
                await this.handleToolCallRequest(params),
        );

        this.connection.onClose(() => {
            if (this.state === "connected" && this.options.autoRestart) {
                void this.reconnect();
            }
        });

        this.connection.onError((_error) => {
            // Connection errors are handled via autoRestart if enabled
        });
    }

    private handleSessionEventNotification(notification: unknown): void {
        if (
            typeof notification !== "object" ||
            !notification ||
            !("sessionId" in notification) ||
            typeof (notification as { sessionId?: unknown }).sessionId !== "string" ||
            !("event" in notification)
        ) {
            return;
        }

        const session = this.sessions.get((notification as { sessionId: string }).sessionId);
        if (session) {
            session._dispatchEvent((notification as { event: SessionEvent }).event);
        }
    }

    private async handleToolCallRequest(params: ToolCallRequestPayload): Promise<ToolCallResponsePayload> {
        if (
            !params ||
            typeof params.sessionId !== "string" ||
            typeof params.toolCallId !== "string" ||
            typeof params.toolName !== "string"
        ) {
            throw new Error("Invalid tool call payload");
        }

        const session = this.sessions.get(params.sessionId);
        if (!session) {
            throw new Error(`Unknown session ${params.sessionId}`);
        }

        const handler = session.getToolHandler(params.toolName);
        if (!handler) {
            return { result: this.buildUnsupportedToolResult(params.toolName) };
        }

        return await this.executeToolCall(handler, params);
    }

    private async executeToolCall(
        handler: ToolHandler,
        request: ToolCallRequestPayload,
    ): Promise<ToolCallResponsePayload> {
        try {
            const result = await handler({
                sessionId: request.sessionId,
                toolCallId: request.toolCallId,
                toolName: request.toolName,
                arguments: request.arguments,
            });

            return { result: this.normalizeToolResult(result) };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                result: {
                    textResultForLlm: message,
                    resultType: "failure",
                    error: message,
                    toolTelemetry: {},
                },
            };
        }
    }

    private normalizeToolResult(result: ToolResult | undefined): ToolResult {
        if (result === undefined || result === null) {
            return {
                textResultForLlm: "Tool returned no result",
                resultType: "failure",
                error: "tool returned no result",
                toolTelemetry: {},
            };
        }
        return result;
    }

    private buildUnsupportedToolResult(toolName: string): ToolResult {
        return {
            textResultForLlm: `Tool '${toolName}' is not supported by this client instance.`,
            resultType: "failure",
            error: `tool '${toolName}' not supported`,
            toolTelemetry: {},
        };
    }

    /**
     * Attempt to reconnect to the server
     */
    private async reconnect(): Promise<void> {
        this.state = "disconnected";
        try {
            await this.stop();
            await this.start();
        } catch (_error) {
            // Reconnection failed
        }
    }
}
