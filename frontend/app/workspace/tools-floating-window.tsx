import { getToolsFacade } from "@/compat";
import { buildToolExecutionContext, formatJson, getApprovalToken } from "@/app/workspace/widget-helpers";
import type { PendingToolApproval, ToolsFloatingWindowProps } from "@/app/workspace/widget-types";
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

const ToolsFloatingWindow = memo(({ isOpen, onClose, referenceElement, onAuditChanged }: ToolsFloatingWindowProps) => {
    const [pendingApproval, setPendingApproval] = useState<PendingToolApproval | null>(null);
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

        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedTool = tools.find((tool) => tool.name === selectedToolName) ?? null;

    const handleToolSelect = (toolName: string) => {
        setSelectedToolName(toolName);
        setInputValue("{}");
        setResponseValue(null);
        setExecuteError(null);
        setPendingApproval(null);
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
                context: buildToolExecutionContext(repoRoot),
            };
            const response = await facade.executeTool(request);
            setResponseValue(response);
            onAuditChanged?.();
            if (response.status === "requires_confirmation" && response.pending_approval != null) {
                setPendingApproval({
                    approval: response.pending_approval,
                    request,
                });
            } else {
                setPendingApproval(null);
            }
        } catch (error) {
            setExecuteError(error instanceof Error ? error.message : String(error));
            setResponseValue(null);
            setPendingApproval(null);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleConfirm = async () => {
        if (pendingApproval == null) {
            return;
        }

        setIsConfirming(true);
        setExecuteError(null);

        try {
            const facade = await getToolsFacade();
            const confirmResponse = await facade.confirmApproval(pendingApproval.approval.id, pendingApproval.request.context);
            onAuditChanged?.();
            const approvalToken = getApprovalToken(confirmResponse);
            if (!approvalToken) {
                setResponseValue(confirmResponse);
                setExecuteError("Approval token was missing from confirmation response");
                return;
            }

            const retryResponse = await facade.executeTool({
                ...pendingApproval.request,
                approval_token: approvalToken,
            });
            setResponseValue(retryResponse);
            onAuditChanged?.();
            if (retryResponse.status === "requires_confirmation" && retryResponse.pending_approval != null) {
                setPendingApproval({
                    approval: retryResponse.pending_approval,
                    request: pendingApproval.request,
                });
            } else {
                setPendingApproval(null);
            }
        } catch (error) {
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
                                    <div className="text-xs text-secondary whitespace-pre-wrap break-words">
                                        input schema:
                                        <pre className="mt-1 p-2 rounded bg-black/20 overflow-auto text-[11px] text-secondary">
                                            {JSON.stringify(selectedTool.input_schema, null, 2)}
                                        </pre>
                                    </div>
                                    <div>
                                        <div className="text-xs text-secondary mb-1">input json:</div>
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
            </div>
        </FloatingPortal>
    );
});

ToolsFloatingWindow.displayName = "ToolsFloatingWindow";

export { ToolsFloatingWindow };
