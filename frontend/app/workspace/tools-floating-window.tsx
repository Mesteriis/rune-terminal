import { getMCPFacade, getToolsFacade } from "@/compat";
import {
    bindApprovalRetryRequest,
    clearStoredPendingToolApproval,
    isStalePendingApprovalError,
    listStoredPendingToolApprovalsForWorkspace,
    replaceStoredPendingToolApproval,
    storePendingToolApproval,
} from "@/app/approval/continuity";
import { workspaceStore } from "@/app/state/workspace.store";
import { useActiveWorkspaceContext } from "@/app/workspace/active-context";
import { buildToolExecutionContext, formatAuditTimestamp, formatJson, getApprovalToken } from "@/app/workspace/widget-helpers";
import type { PendingToolApproval, ToolsFloatingWindowProps } from "@/app/workspace/widget-types";
import type { MCPServerRuntime } from "@/rterm-api/mcp/types";
import type { ToolExecutionRequest, ToolExecutionResponse, ToolInfo } from "@/rterm-api/tools/types";
import {
    FloatingPortal,
    autoUpdate,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import clsx from "clsx";
import { memo, useEffect, useState } from "react";

function hasObjectProperty(schema: unknown, property: string): boolean {
    if (schema == null || typeof schema !== "object") {
        return false;
    }
    const properties = (schema as { properties?: Record<string, unknown> }).properties;
    if (properties == null || typeof properties !== "object") {
        return false;
    }
    return Object.prototype.hasOwnProperty.call(properties, property);
}

const ToolsFloatingWindow = memo(({ isOpen, onClose, referenceElement, onAuditChanged }: ToolsFloatingWindowProps) => {
    const activeContext = useActiveWorkspaceContext();
    const getActiveWorkspaceID = () => workspaceStore.getSnapshot().active.oid;
    const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(
        () => listStoredPendingToolApprovalsForWorkspace(getActiveWorkspaceID())[0] ?? null,
    );
    const [tools, setTools] = useState<ToolInfo[]>([]);
    const [selectedToolName, setSelectedToolName] = useState("");
    const [repoRoot, setRepoRoot] = useState("");
    const [inputValue, setInputValue] = useState("{}");
    const [responseValue, setResponseValue] = useState<ToolExecutionResponse | null>(null);
    const [executeError, setExecuteError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [mcpServers, setMCPServers] = useState<MCPServerRuntime[]>([]);
    const [mcpLoading, setMCPLoading] = useState(true);
    const [mcpLoadError, setMCPLoadError] = useState<string | null>(null);
    const [mcpActionError, setMCPActionError] = useState<string | null>(null);
    const [mcpActionKey, setMCPActionKey] = useState<string | null>(null);
    const [mcpInvokeServerID, setMCPInvokeServerID] = useState("");
    const [mcpInvokePayload, setMCPInvokePayload] = useState("{}");
    const [mcpAllowOnDemandStart, setMCPAllowOnDemandStart] = useState(false);
    const [mcpInvokeResult, setMCPInvokeResult] = useState<unknown>(null);
    const [mcpInvokeError, setMCPInvokeError] = useState<string | null>(null);
    const [mcpInvoking, setMCPInvoking] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: onClose,
        placement: "left-start",
        middleware: [offset(-2), shift({ padding: 12 })],
        whileElementsMounted: autoUpdate,
        elements: {
            reference: referenceElement,
        },
    });

    const dismiss = useDismiss(context);
    const { getFloatingProps } = useInteractions([dismiss]);

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setMCPLoading(true);
        setMCPLoadError(null);
        setMCPActionError(null);
        setPendingApproval(listStoredPendingToolApprovalsForWorkspace(getActiveWorkspaceID())[0] ?? null);

        void (async () => {
            try {
                const facade = await getToolsFacade();
                const [response, bootstrap] = await Promise.all([facade.listTools(), facade.getBootstrap()]);
                if (cancelled) {
                    return;
                }
                const nextTools = response.tools ?? [];
                setRepoRoot(bootstrap.repo_root ?? "");
                setTools(nextTools);
                setSelectedToolName((current) => {
                    if (current && nextTools.some((tool) => tool.name === current)) {
                        return current;
                    }
                    return nextTools[0]?.name ?? "";
                });
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error instanceof Error ? error.message : String(error));
                    setTools([]);
                    setSelectedToolName("");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        })();

        void (async () => {
            try {
                const facade = await getMCPFacade();
                const response = await facade.listServers();
                if (cancelled) {
                    return;
                }
                setMCPServers(response);
                setMCPInvokeServerID((current) => {
                    if (current && response.some((server) => server.id === current)) {
                        return current;
                    }
                    return response[0]?.id ?? "";
                });
            } catch (error) {
                if (!cancelled) {
                    setMCPLoadError(error instanceof Error ? error.message : String(error));
                    setMCPServers([]);
                }
            } finally {
                if (!cancelled) {
                    setMCPLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedTool = tools.find((tool) => tool.name === selectedToolName) ?? null;
    const selectedToolSchema = selectedTool?.input_schema;
    const canUseSelectedFileInToolInput =
        activeContext.activeFilePath !== "" &&
        selectedTool != null &&
        (hasObjectProperty(selectedToolSchema, "path") || hasObjectProperty(selectedToolSchema, "paths"));
    const canUseActiveWidgetInToolInput =
        activeContext.activeWidgetID !== "" && selectedTool != null && hasObjectProperty(selectedToolSchema, "widget_id");
    const normalizeMCPState = (server: MCPServerRuntime): "active" | "idle" | "stopped" | "disabled" => {
        if (!server.enabled) {
            return "disabled";
        }
        if (server.state === "idle") {
            return "idle";
        }
        if (server.state === "active" || server.state === "starting") {
            return "active";
        }
        return "stopped";
    };

    const refreshMCPServers = async () => {
        setMCPLoading(true);
        setMCPLoadError(null);
        try {
            const facade = await getMCPFacade();
            const response = await facade.listServers();
            setMCPServers(response);
        } catch (error) {
            setMCPLoadError(error instanceof Error ? error.message : String(error));
            setMCPServers([]);
        } finally {
            setMCPLoading(false);
        }
    };

    const handleMCPAction = async (
        serverID: string,
        action: "start" | "stop" | "restart" | "enable" | "disable",
    ) => {
        setMCPActionError(null);
        const key = `${serverID}:${action}`;
        setMCPActionKey(key);
        try {
            const facade = await getMCPFacade();
            switch (action) {
                case "start":
                    await facade.startServer(serverID);
                    break;
                case "stop":
                    await facade.stopServer(serverID);
                    break;
                case "restart":
                    await facade.restartServer(serverID);
                    break;
                case "enable":
                    await facade.enableServer(serverID);
                    break;
                case "disable":
                    await facade.disableServer(serverID);
                    break;
            }
            await refreshMCPServers();
        } catch (error) {
            setMCPActionError(error instanceof Error ? error.message : String(error));
        } finally {
            setMCPActionKey(null);
        }
    };

    const handleMCPInvoke = async () => {
        if (!mcpInvokeServerID) {
            setMCPInvokeError("Select an MCP server first.");
            return;
        }

        let payload: Record<string, unknown> | undefined = undefined;
        const trimmed = mcpInvokePayload.trim();
        if (trimmed !== "") {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
                    payload = parsed as Record<string, unknown>;
                } else {
                    setMCPInvokeError("Payload must be a JSON object.");
                    return;
                }
            } catch (error) {
                setMCPInvokeError(error instanceof Error ? error.message : String(error));
                return;
            }
        }

        setMCPInvoking(true);
        setMCPInvokeError(null);
        try {
            const facade = await getMCPFacade();
            const result = await facade.invoke({
                server_id: mcpInvokeServerID,
                payload,
                allow_on_demand_start: mcpAllowOnDemandStart,
                action_source: "workspace.tools.mcp_invoke",
                workspace_id: activeContext.workspaceID || undefined,
            });
            setMCPInvokeResult(result);
            await refreshMCPServers();
        } catch (error) {
            setMCPInvokeError(error instanceof Error ? error.message : String(error));
            setMCPInvokeResult(null);
        } finally {
            setMCPInvoking(false);
        }
    };

    const handleToolSelect = (toolName: string) => {
        if (pendingApproval != null) {
            clearStoredPendingToolApproval(pendingApproval.approval.id);
        }
        setSelectedToolName(toolName);
        setInputValue("{}");
        setResponseValue(null);
        setExecuteError(null);
        setPendingApproval(null);
    };

    const patchToolInput = (patcher: (value: Record<string, unknown>) => void) => {
        let parsedInput: unknown = {};
        const trimmedInput = inputValue.trim();
        if (trimmedInput !== "") {
            try {
                parsedInput = JSON.parse(trimmedInput);
            } catch (error) {
                setExecuteError(error instanceof Error ? error.message : String(error));
                return;
            }
        }
        if (parsedInput == null || typeof parsedInput !== "object" || Array.isArray(parsedInput)) {
            setExecuteError("Tool input must be a JSON object.");
            return;
        }
        const nextInput = { ...(parsedInput as Record<string, unknown>) };
        patcher(nextInput);
        setInputValue(JSON.stringify(nextInput, null, 2));
        setExecuteError(null);
    };

    const applySelectedFileToToolInput = () => {
        if (activeContext.activeFilePath === "") {
            return;
        }
        patchToolInput((nextInput) => {
            if (hasObjectProperty(selectedToolSchema, "path")) {
                nextInput.path = activeContext.activeFilePath;
            } else {
                nextInput.paths = [activeContext.activeFilePath];
            }
        });
    };

    const applyActiveWidgetToToolInput = () => {
        if (activeContext.activeWidgetID === "") {
            return;
        }
        patchToolInput((nextInput) => {
            nextInput.widget_id = activeContext.activeWidgetID;
        });
    };

    const handleExecute = async () => {
        if (selectedTool == null) {
            return;
        }

        let parsedInput: unknown = {};
        const trimmedInput = inputValue.trim();
        if (trimmedInput !== "") {
            try {
                parsedInput = JSON.parse(trimmedInput);
            } catch (error) {
                setExecuteError(error instanceof Error ? error.message : String(error));
                setResponseValue(null);
                return;
            }
        }

        setIsExecuting(true);
        setExecuteError(null);

        try {
            const facade = await getToolsFacade();
            const request: ToolExecutionRequest = {
                tool_name: selectedTool.name,
                input: parsedInput,
                context: buildToolExecutionContext(repoRoot, "workspace.tools.execute"),
            };
            const response = await facade.executeTool(request);
            setResponseValue(response);
            onAuditChanged?.();
            if (response.status === "requires_confirmation" && response.pending_approval != null) {
                const nextPendingApproval = {
                    approval: response.pending_approval,
                    request,
                };
                storePendingToolApproval(nextPendingApproval);
                setPendingApproval(nextPendingApproval);
            } else {
                if (pendingApproval != null) {
                    clearStoredPendingToolApproval(pendingApproval.approval.id);
                }
                setPendingApproval(null);
            }
        } catch (error) {
            setExecuteError(error instanceof Error ? error.message : String(error));
            setResponseValue(null);
            if (pendingApproval != null) {
                clearStoredPendingToolApproval(pendingApproval.approval.id);
            }
            setPendingApproval(null);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleConfirm = async () => {
        const approvalContext = pendingApproval ?? listStoredPendingToolApprovalsForWorkspace(getActiveWorkspaceID())[0] ?? null;
        if (approvalContext == null) {
            return;
        }

        setIsConfirming(true);
        setExecuteError(null);

        try {
            const facade = await getToolsFacade();
            const confirmResponse = await facade.confirmApproval(approvalContext.approval.id, approvalContext.request.context);
            onAuditChanged?.();
            const approvalToken = getApprovalToken(confirmResponse);
            if (!approvalToken) {
                if (confirmResponse.status === "error" && isStalePendingApprovalError(confirmResponse.error)) {
                    clearStoredPendingToolApproval(approvalContext.approval.id);
                    setPendingApproval(null);
                    setExecuteError("Pending approval is no longer available. Execute the tool again to request approval.");
                    setResponseValue(confirmResponse);
                    return;
                }
                setResponseValue(confirmResponse);
                setExecuteError("Approval token was missing from confirmation response");
                return;
            }

            const retryResponse = await facade.executeTool(bindApprovalRetryRequest(approvalContext.request, approvalToken));
            setResponseValue(retryResponse);
            onAuditChanged?.();
            if (retryResponse.status === "requires_confirmation" && retryResponse.pending_approval != null) {
                const nextPendingApproval = {
                    approval: retryResponse.pending_approval,
                    request: approvalContext.request,
                };
                replaceStoredPendingToolApproval(approvalContext.approval.id, nextPendingApproval);
                setPendingApproval(nextPendingApproval);
            } else {
                clearStoredPendingToolApproval(approvalContext.approval.id);
                setPendingApproval(null);
            }
        } catch (error) {
            if (isStalePendingApprovalError(error)) {
                clearStoredPendingToolApproval(approvalContext.approval.id);
                setPendingApproval(null);
                setExecuteError("Pending approval is no longer available. Execute the tool again to request approval.");
                return;
            }
            setExecuteError(error instanceof Error ? error.message : String(error));
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[32rem]"
            >
                <div className="text-sm font-medium text-white mb-3">Tools</div>
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                    </div>
                ) : loadError ? (
                    <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                ) : tools.length === 0 ? (
                    <div className="text-sm text-muted">No tools available</div>
                ) : (
                    <div className="flex gap-3 min-h-64">
                        <div className="w-52 shrink-0 border border-border rounded overflow-hidden">
                            <div className="max-h-72 overflow-y-auto">
                                {tools.map((tool) => {
                                    const selected = tool.name === selectedToolName;
                                    return (
                                        <button
                                            key={tool.name}
                                            type="button"
                                            className={clsx(
                                                "w-full text-left px-3 py-2 border-b border-border last:border-b-0 transition-colors",
                                                selected ? "bg-hoverbg text-white" : "text-secondary hover:bg-hoverbg hover:text-white"
                                            )}
                                            onClick={() => handleToolSelect(tool.name)}
                                        >
                                            <div className="text-sm leading-tight">{tool.name}</div>
                                            <div className="text-xs opacity-70 mt-1">
                                                {tool.metadata.approval_tier} / {tool.metadata.target_kind}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            {selectedTool ? (
                                <div className="space-y-3">
                                    <div>
                                        <div className="text-sm text-white">{selectedTool.name}</div>
                                        <div className="text-xs text-secondary mt-1 whitespace-pre-wrap">
                                            {selectedTool.description}
                                        </div>
                                    </div>
                                    <div className="text-xs text-secondary whitespace-pre-wrap break-words">
                                        capabilities: {selectedTool.metadata.capabilities.join(", ") || "none"}
                                    </div>
                                    <div className="rounded border border-border bg-black/20 px-2 py-1.5 text-[11px] text-secondary space-y-1">
                                        <div>
                                            active widget: {activeContext.activeWidgetID || "none"}{" "}
                                            {activeContext.activeTerminalTarget
                                                ? `(${activeContext.activeTerminalTarget.targetSession}:${activeContext.activeTerminalTarget.targetConnectionID})`
                                                : ""}
                                        </div>
                                        <div className="break-all">
                                            selected file: {activeContext.activeFilePath || "none"}
                                        </div>
                                    </div>
                                    <div className="text-xs text-secondary whitespace-pre-wrap break-words">
                                        input schema:
                                        <pre className="mt-1 p-2 rounded bg-black/20 overflow-auto text-[11px] text-secondary">
                                            {JSON.stringify(selectedTool.input_schema, null, 2)}
                                        </pre>
                                    </div>
                                    <div>
                                        <div className="text-xs text-secondary mb-1">input json:</div>
                                        <div className="mb-2 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="px-2 py-1 rounded border border-border text-[11px] text-secondary disabled:opacity-50"
                                                disabled={!canUseSelectedFileInToolInput}
                                                onClick={applySelectedFileToToolInput}
                                            >
                                                Use Selected File Path
                                            </button>
                                            <button
                                                type="button"
                                                className="px-2 py-1 rounded border border-border text-[11px] text-secondary disabled:opacity-50"
                                                disabled={!canUseActiveWidgetInToolInput}
                                                onClick={applyActiveWidgetToToolInput}
                                            >
                                                Use Active Widget
                                            </button>
                                        </div>
                                        <textarea
                                            className="w-full min-h-32 rounded border border-border bg-black/20 p-2 text-xs text-white resize-y"
                                            value={inputValue}
                                            onChange={(e) => setInputValue(e.target.value)}
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs text-secondary break-all">repo root: {repoRoot || "unknown"}</div>
                                        <button
                                            type="button"
                                            className="px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50"
                                            disabled={isExecuting}
                                            onClick={() => void handleExecute()}
                                        >
                                            {isExecuting ? "Running..." : "Execute"}
                                        </button>
                                    </div>
                                    {pendingApproval ? (
                                        <div className="rounded border border-border p-2 bg-black/20 space-y-2">
                                            <div className="text-xs text-secondary">
                                                approval required: {pendingApproval.approval.summary}
                                            </div>
                                            <div className="text-xs text-secondary">
                                                tier: {pendingApproval.approval.approval_tier}
                                            </div>
                                            <button
                                                type="button"
                                                className="px-3 py-1.5 rounded bg-accent text-black text-xs font-medium disabled:opacity-50"
                                                disabled={isConfirming}
                                                onClick={() => void handleConfirm()}
                                            >
                                                {isConfirming ? "Confirming..." : "Confirm and retry"}
                                            </button>
                                        </div>
                                    ) : null}
                                    <div>
                                        <div className="text-xs text-secondary mb-1">response:</div>
                                        <pre className="min-h-28 max-h-64 overflow-auto rounded bg-black/20 p-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
                                            {executeError ?? (responseValue ? formatJson(responseValue) : "No response yet")}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-muted">Select a tool to inspect its contract</div>
                            )}
                        </div>
                    </div>
                )}
                <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs font-medium text-white mb-2">MCP Servers</div>
                    {mcpLoading ? (
                        <div className="text-xs text-secondary">Loading MCP servers...</div>
                    ) : mcpLoadError ? (
                        <div className="text-xs text-red-400 whitespace-pre-wrap">{mcpLoadError}</div>
                    ) : mcpServers.length === 0 ? (
                        <div className="text-xs text-secondary">No MCP servers configured</div>
                    ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            {mcpServers.map((server) => (
                                <div
                                    key={server.id}
                                    className="rounded border border-border bg-black/20 px-2 py-1.5 text-[11px] text-secondary"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-white">{server.id}</span>
                                        <span>{normalizeMCPState(server)}</span>
                                    </div>
                                    <div className="mt-1 break-all">
                                        last used: {server.last_used ? formatAuditTimestamp(server.last_used) : "never"}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {(["start", "stop", "restart", "enable", "disable"] as const).map((action) => (
                                            <button
                                                key={action}
                                                type="button"
                                                className="px-2 py-0.5 rounded border border-border text-[10px] text-secondary hover:text-white disabled:opacity-50"
                                                disabled={mcpActionKey != null}
                                                onClick={() => void handleMCPAction(server.id, action)}
                                            >
                                                {mcpActionKey === `${server.id}:${action}` ? `${action}...` : action}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {mcpActionError ? (
                        <div className="mt-2 text-xs text-red-400 whitespace-pre-wrap">{mcpActionError}</div>
                    ) : null}
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                        <div className="text-xs text-white">Invoke MCP</div>
                        <div className="flex items-center gap-2">
                            <label className="text-[11px] text-secondary">server:</label>
                            <select
                                className="min-w-0 flex-1 rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                                value={mcpInvokeServerID}
                                onChange={(e) => setMCPInvokeServerID(e.target.value)}
                            >
                                {mcpServers.map((server) => (
                                    <option key={server.id} value={server.id}>
                                        {server.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="text-[11px] text-secondary mb-1">payload json:</div>
                            <textarea
                                className="w-full min-h-20 rounded border border-border bg-black/20 p-2 text-[11px] text-white resize-y"
                                value={mcpInvokePayload}
                                onChange={(e) => setMCPInvokePayload(e.target.value)}
                                spellCheck={false}
                            />
                        </div>
                        <label className="flex items-center gap-1.5 text-[11px] text-secondary">
                            <input
                                type="checkbox"
                                checked={mcpAllowOnDemandStart}
                                onChange={(e) => setMCPAllowOnDemandStart(e.target.checked)}
                            />
                            allow on-demand start
                        </label>
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                className="px-3 py-1 rounded bg-accent text-black text-[11px] font-medium disabled:opacity-50"
                                disabled={mcpInvoking || mcpServers.length === 0}
                                onClick={() => void handleMCPInvoke()}
                            >
                                {mcpInvoking ? "Invoking..." : "Invoke MCP"}
                            </button>
                        </div>
                        <div>
                            <div className="text-[11px] text-secondary mb-1">invoke result:</div>
                            <pre className="max-h-36 overflow-auto rounded bg-black/20 p-2 text-[11px] text-secondary whitespace-pre-wrap break-words">
                                {mcpInvokeError ?? (mcpInvokeResult ? formatJson(mcpInvokeResult) : "No MCP invoke yet")}
                            </pre>
                        </div>
                        <div className="text-[10px] text-secondary">
                            MCP invoke output stays in this panel only. It is not auto-injected into agent context.
                        </div>
                    </div>
                </div>
            </div>
        </FloatingPortal>
    );
});

ToolsFloatingWindow.displayName = "ToolsFloatingWindow";

export { ToolsFloatingWindow };
