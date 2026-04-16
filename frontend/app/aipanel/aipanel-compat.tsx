import { waveAIHasSelection } from "@/app/aipanel/waveai-focus-utils";
import {
    clearStoredPendingRunApproval,
    getStoredPendingRunApproval,
    isStalePendingApprovalError,
    listStoredPendingRunApprovalsForWorkspace,
    replaceStoredPendingRunApproval,
    storePendingRunApproval,
    type StoredPendingRunApproval,
} from "@/app/approval/continuity";
import { workspaceStore } from "@/app/state/workspace.store";
import { atoms, getApi, getSettingsKeyAtom } from "@/app/store/global";
import { globalStore } from "@/app/store/jotaiStore";
import { buildToolExecutionContext } from "@/app/workspace/widget-helpers";
import { createCompatApiFacade } from "@/compat/api";
import { getAgentFacade } from "@/compat/agent";
import { getConversationFacade } from "@/compat/conversation";
import { getExecutionFacade, type ExecutionBlock } from "@/compat/execution";
import { getTerminalFacade } from "@/compat/terminal";
import { getToolsFacade } from "@/compat/tools";
import { isMacOS, isWindows } from "@/util/platformutil";
import { cn } from "@/util/util";
import { useAtomValue } from "jotai";
import * as jotai from "jotai";
import type { AgentCatalog } from "@/rterm-api/agent/types";
import { getApprovalGrant } from "@/rterm-api/tools/client";
import type { AttachmentReference, ConversationContext } from "@/rterm-api/conversation/types";
import type { ToolExecutionContext, ToolExecutionResponse } from "@/rterm-api/tools/types";
import { ApiError } from "@/rterm-api/http/errors";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { formatFileSizeError, isAcceptableFile, validateFileSize } from "./ai-utils";
import { AgentSelectionStrip } from "./agent-selection-strip";
import { AIDroppedFiles } from "./aidroppedfiles";
import { ExecutionBlockList } from "./execution-block-list";
import { AIPanelHeader } from "./aipanelheader";
import { AIPanelInput } from "./aipanelinput";
import { AIPanelMessages } from "./aipanelmessages";
import {
    buildCompatConversationContext,
    formatProviderLabel,
    formatSelectionSummary,
    mapConversationSnapshot,
} from "./compat-conversation";
import { handleWaveAIContextMenu } from "./aipanel-contextmenu";
import type { WaveUIMessage } from "./aitypes";
import {
    executeRunCommandPrompt,
    explainRunCommandPrompt,
    parseRunCommandPrompt,
} from "./run-command";
import { type PendingRunApprovalEntry, RunCommandApprovalList } from "./run-command-approval";
import { WaveAIModel } from "./waveai-model";

const AIBlockMask = memo(() => {
    return (
        <div
            key="block-mask"
            className="absolute top-0 left-0 right-0 bottom-0 border-1 border-transparent pointer-events-auto select-none p-0.5"
            style={{
                borderRadius: "var(--block-border-radius)",
                zIndex: "var(--zindex-block-mask-inner)",
            }}
        >
            <div
                className="w-full mt-[44px] h-[calc(100%-44px)] flex items-center justify-center"
                style={{
                    backgroundColor: "rgb(from var(--block-bg-color) r g b / 50%)",
                }}
            >
                <div className="font-bold opacity-70 mt-[-25%] text-[60px]">0</div>
            </div>
        </div>
    );
});

AIBlockMask.displayName = "AIBlockMask";

const AIDragOverlay = memo(() => {
    return (
        <div
            key="drag-overlay"
            className="absolute inset-0 bg-accent/20 border-2 border-dashed border-accent rounded-lg flex items-center justify-center z-10 p-4"
        >
            <div className="text-accent text-center">
                <i className="fa fa-upload text-3xl mb-2"></i>
                <div className="text-lg font-semibold">Drop files here</div>
                <div className="text-sm">Images, PDFs, and text/code files supported</div>
            </div>
        </div>
    );
});

AIDragOverlay.displayName = "AIDragOverlay";

const KeyCap = memo(({ children, className }: { children: ReactNode; className?: string }) => {
    return (
        <kbd
            className={cn(
                "px-1.5 py-0.5 text-xs bg-zinc-700 border border-zinc-600 rounded-sm shadow-sm font-mono",
                className
            )}
        >
            {children}
        </kbd>
    );
});

KeyCap.displayName = "KeyCap";

const CompatConversationWelcome = memo(
    ({ providerLabel, selectionSummary }: { providerLabel: string; selectionSummary: string }) => {
        const modKey = isMacOS() ? "⌘" : "Alt";

        return (
            <div className="text-secondary py-8">
                <div className="text-center">
                    <i className="fa fa-sparkles text-4xl text-accent mb-2 block"></i>
                    <p className="text-lg font-bold text-primary">TideTerm AI</p>
                </div>
                <div className="mt-4 text-left max-w-md mx-auto">
                    <p className="text-sm mb-4">
                        The active compat panel is now backed by the RunaTerminal agent catalog and conversation API.
                    </p>
                    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                        <div className="text-sm font-semibold mb-3 text-accent">Current backend context</div>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-bold">Provider:</span> {providerLabel}
                            </div>
                            <div>
                                <span className="font-bold">Selection:</span> {selectionSummary}
                            </div>
                            <div className="text-muted">
                                Responses are currently non-streaming and arrive after the backend provider finishes.
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm">
                        <div>
                            <KeyCap>{modKey}</KeyCap>
                            <KeyCap className="ml-1">Shift</KeyCap>
                            <KeyCap className="ml-1">A</KeyCap>
                            <span className="ml-1.5">to toggle the panel</span>
                        </div>
                        <div>
                            {isWindows() ? (
                                <>
                                    <KeyCap>Alt</KeyCap>
                                    <KeyCap className="ml-1">0</KeyCap>
                                    <span className="ml-1.5">to focus the composer</span>
                                </>
                            ) : (
                                <>
                                    <KeyCap>Ctrl</KeyCap>
                                    <KeyCap className="ml-1">Shift</KeyCap>
                                    <KeyCap className="ml-1">0</KeyCap>
                                    <span className="ml-1.5">to focus the composer</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

CompatConversationWelcome.displayName = "CompatConversationWelcome";

const CompatAIErrorMessage = memo(() => {
    const model = WaveAIModel.getInstance();
    const errorMessage = jotai.useAtomValue(model.errorMessage);

    if (!errorMessage) {
        return null;
    }

    return (
        <div className="px-4 py-2 text-red-400 bg-red-900/20 border-l-4 border-red-500 mx-2 mb-2 relative">
            <button
                onClick={() => model.clearError()}
                className="absolute top-2 right-2 text-red-400 hover:text-red-300 cursor-pointer z-10"
                aria-label="Close error"
            >
                <i className="fa fa-times text-sm"></i>
            </button>
            <div className="text-sm pr-6 max-h-[100px] overflow-y-auto">{errorMessage}</div>
        </div>
    );
});

CompatAIErrorMessage.displayName = "CompatAIErrorMessage";

function replacePendingRunApproval(
    approvals: PendingRunApproval[],
    currentApprovalId: string,
    nextApproval: PendingRunApproval | null,
): PendingRunApproval[] {
    const remaining = approvals.filter((approval) => approval.approvalId !== currentApprovalId);
    if (nextApproval == null) {
        return remaining;
    }
    return [...remaining, nextApproval];
}

function toPendingRunApprovalEntry(approval: StoredPendingRunApproval): PendingRunApproval {
    return {
        ...approval,
        confirming: false,
    };
}

function buildConversationContextFromToolContext(
    context: ToolExecutionContext,
    actionSource?: string,
): ConversationContext {
    return {
        ...context,
        action_source: actionSource?.trim() || context.action_source,
        widget_context_enabled: context.active_widget_id != null,
    };
}

function buildApprovalConfirmErrorMessage(response: ToolExecutionResponse): string {
    if (response.status === "error") {
        return response.error?.trim() || "The runtime rejected the approval confirmation.";
    }
    if (response.status === "requires_confirmation") {
        const summary = response.pending_approval?.summary?.trim();
        return summary || "The runtime requested another approval step before confirmation could complete.";
    }
    return "Approval token was missing from the confirmation response.";
}

function looksLikeAbsolutePath(path: string): boolean {
    return /^([A-Za-z]:[\\/]|\/)/.test(path);
}

function resolveNativeFilePath(file: File): string {
    const fromFile = (file as File & { path?: string }).path;
    if (typeof fromFile === "string" && fromFile.trim() !== "") {
        return fromFile.trim();
    }
    try {
        const fromApi = getApi()?.getPathForFile?.(file);
        if (typeof fromApi === "string" && fromApi.trim() !== "") {
            return fromApi.trim();
        }
    } catch {
        // Fall through to empty path.
    }
    return "";
}

function parseMissingAttachmentPath(message: string): string {
    const marker = "attachment not found:";
    const normalized = message.trim();
    const markerIndex = normalized.toLowerCase().indexOf(marker);
    if (markerIndex === -1) {
        return "";
    }
    return normalized.slice(markerIndex + marker.length).trim();
}

interface PendingRunApproval extends PendingRunApprovalEntry {
    toolContext: ToolExecutionContext;
    conversationContext: ConversationContext;
}

const AIPanelCompatInner = memo(() => {
    const [messages, setMessages] = useState<WaveUIMessage[]>([]);
    const [pendingRunApprovals, setPendingRunApprovals] = useState<PendingRunApproval[]>(() =>
        listStoredPendingRunApprovalsForWorkspace(workspaceStore.getSnapshot().active.oid).map(toPendingRunApprovalEntry),
    );
    const [status, setStatus] = useState("ready");
    const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
    const [executionBlocks, setExecutionBlocks] = useState<ExecutionBlock[]>([]);
    const [repoRoot, setRepoRoot] = useState("");
    const [workspaceId, setWorkspaceId] = useState(() => workspaceStore.getSnapshot().active.oid || "");
    const [isDragOver, setIsDragOver] = useState(false);
    const [isReactDndDragOver, setIsReactDndDragOver] = useState(false);
    const [initialLoadDone, setInitialLoadDone] = useState(false);
    const [selectionBusy, setSelectionBusy] = useState(false);
    const [providerLabel, setProviderLabel] = useState("Unavailable");
    const model = WaveAIModel.getInstance();
    const containerRef = useRef<HTMLDivElement>(null);
    const isLayoutMode = useAtomValue(atoms.controlShiftDelayAtom);
    const showOverlayBlockNums = useAtomValue(getSettingsKeyAtom("app:showoverlayblocknums")) ?? true;
    const isFocused = useAtomValue(model.isWaveAIFocusedAtom);
    const isPanelVisible = useAtomValue(model.getPanelVisibleAtom());
    const showBlockMask = isLayoutMode && showOverlayBlockNums;

    useEffect(() => {
        globalStore.set(model.isAIStreaming, false);
        return () => {
            globalStore.set(model.isAIStreaming, false);
        };
    }, [model]);

    useEffect(() => {
        globalStore.set(model.isChatEmptyAtom, messages.length === 0);
    }, [messages, model]);

    const refreshExecutionBlocks = useCallback(
        async (workspaceID: string) => {
            const executionFacade = await getExecutionFacade();
            const response = await executionFacade.listBlocks(workspaceID || undefined, 20);
            const blocks = Array.isArray(response.blocks) ? response.blocks : [];
            blocks.sort((left, right) => {
                return Date.parse(right.created_at) - Date.parse(left.created_at);
            });
            setExecutionBlocks(blocks);
        },
        [],
    );

    useEffect(() => {
        let cancelled = false;
        setInitialLoadDone(false);
        model.clearError();

        void (async () => {
            const [conversationFacade, agentFacade, compatApi] = await Promise.all([
                getConversationFacade(),
                getAgentFacade(),
                createCompatApiFacade(),
            ]);
            const [snapshotResult, catalogResult, bootstrapResult] = await Promise.allSettled([
                conversationFacade.getSnapshot(),
                agentFacade.getCatalog(),
                compatApi.clients.bootstrap.getBootstrap(),
            ]);

            if (cancelled) {
                return;
            }

            const errors: string[] = [];

            if (snapshotResult.status === "fulfilled") {
                setMessages(mapConversationSnapshot(snapshotResult.value.conversation));
                setProviderLabel(formatProviderLabel(snapshotResult.value.conversation.provider));
            } else {
                setMessages([]);
                errors.push(snapshotResult.reason instanceof Error ? snapshotResult.reason.message : String(snapshotResult.reason));
            }

            if (catalogResult.status === "fulfilled") {
                setCatalog(catalogResult.value);
            } else {
                setCatalog(null);
                errors.push(catalogResult.reason instanceof Error ? catalogResult.reason.message : String(catalogResult.reason));
            }

            if (bootstrapResult.status === "fulfilled") {
                setRepoRoot(bootstrapResult.value.repo_root ?? "");
                const nextWorkspaceID = bootstrapResult.value.workspace?.id ?? workspaceStore.getSnapshot().active.oid ?? "";
                setWorkspaceId(nextWorkspaceID);
                setPendingRunApprovals(
                    listStoredPendingRunApprovalsForWorkspace(nextWorkspaceID).map(toPendingRunApprovalEntry),
                );
                try {
                    await refreshExecutionBlocks(nextWorkspaceID);
                } catch (error) {
                    errors.push(error instanceof Error ? error.message : String(error));
                    setExecutionBlocks([]);
                }
            } else {
                setRepoRoot("");
                setWorkspaceId("");
                setPendingRunApprovals([]);
                setExecutionBlocks([]);
            }

            if (errors.length > 0) {
                model.setError(errors.join("\n"));
            } else {
                model.clearError();
            }
            setInitialLoadDone(true);
        })().catch((error) => {
            if (!cancelled) {
                setMessages([]);
                setPendingRunApprovals([]);
                setCatalog(null);
                setRepoRoot("");
                setProviderLabel("Unavailable");
                model.setError(error instanceof Error ? error.message : String(error));
                setInitialLoadDone(true);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [model, refreshExecutionBlocks]);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                globalStore.set(model.containerWidth, containerRef.current.offsetWidth);
            }
        };

        updateWidth();

        const resizeObserver = new ResizeObserver(updateWidth);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [model]);

    const handleSelectionChange = useCallback(
        async (type: "profile" | "role" | "mode", id: string) => {
            if (!catalog || status !== "ready") {
                return;
            }
            if (
                (type === "profile" && catalog.active.profile.id === id) ||
                (type === "role" && catalog.active.role.id === id) ||
                (type === "mode" && catalog.active.mode.id === id)
            ) {
                return;
            }

            setSelectionBusy(true);
            model.clearError();

            try {
                const facade = await getAgentFacade();
                const nextCatalog =
                    type === "profile"
                        ? await facade.setActiveProfile({ id })
                        : type === "role"
                          ? await facade.setActiveRole({ id })
                          : await facade.setActiveMode({ id });
                setCatalog(nextCatalog);
            } catch (error) {
                model.setError(error instanceof Error ? error.message : String(error));
            } finally {
                setSelectionBusy(false);
            }
        },
        [catalog, model, status]
    );

    const addAttachmentReferenceByPath = useCallback(
        async (path: string, file: File | null): Promise<AttachmentReference | null> => {
            let normalizedPath = path.trim();
            if (!looksLikeAbsolutePath(normalizedPath) && file != null && repoRoot.trim() !== "") {
                const repoBase = repoRoot.replace(/[\\/]+$/, "");
                normalizedPath = `${repoBase}/${file.name}`;
            }
            if (normalizedPath === "" || !looksLikeAbsolutePath(normalizedPath)) {
                model.setError(
                    "Local attachment path is unavailable in this runtime. Select a local file path exposed by the desktop host.",
                );
                return null;
            }

            const conversationFacade = await getConversationFacade();
            const response = await conversationFacade.createAttachmentReference({
                path: normalizedPath,
                workspace_id: workspaceId || undefined,
                action_source: "ai.panel.attach_local_file",
            });
            const reference = response.attachment;
            const referenceFile =
                file ??
                new File([], reference.name, {
                    type: reference.mime_type || "application/octet-stream",
                });
            await model.addReferencedFile(referenceFile, reference, reference.path);
            return reference;
        },
        [model, repoRoot, workspaceId],
    );

    const attachLocalFiles = useCallback(
        async (files: File[]) => {
            try {
                for (const file of files) {
                    const nativePath = resolveNativeFilePath(file);
                    const attached = await addAttachmentReferenceByPath(nativePath, file);
                    if (attached == null) {
                        return;
                    }
                }
                model.clearError();
            } catch (error) {
                model.setError(error instanceof Error ? error.message : String(error));
            }
        },
        [addAttachmentReferenceByPath, model],
    );

    const completeRunCommandExecution = useCallback(
        async (options: {
            conversationFacade: Awaited<ReturnType<typeof getConversationFacade>>;
            prompt: string;
            command: string;
            context: ConversationContext;
            approvalUsed?: boolean;
            executionResult: Extract<Awaited<ReturnType<typeof executeRunCommandPrompt>>, { kind: "executed" }>;
        }) => {
            try {
                const explanationResponse = await explainRunCommandPrompt({
                    conversationFacade: options.conversationFacade,
                    prompt: options.prompt,
                    command: options.command,
                    widgetId: options.executionResult.widgetId,
                    fromSeq: options.executionResult.fromSeq,
                    approvalUsed: options.approvalUsed,
                    context: options.context,
                });
                setProviderLabel(formatProviderLabel(explanationResponse.conversation.provider));
                setMessages(mapConversationSnapshot(explanationResponse.conversation));
                const executionBlockID = explanationResponse.execution_block_id?.trim();
                if (executionBlockID) {
                    try {
                        const executionFacade = await getExecutionFacade();
                        const blockResponse = await executionFacade.getBlock(executionBlockID);
                        setExecutionBlocks((previous) => {
                            const next = [
                                blockResponse.block,
                                ...previous.filter((block) => block.id !== blockResponse.block.id),
                            ];
                            return next.slice(0, 20);
                        });
                    } catch {
                        await refreshExecutionBlocks(options.context.workspace_id ?? workspaceId);
                    }
                } else {
                    await refreshExecutionBlocks(options.context.workspace_id ?? workspaceId);
                }
            } catch (error) {
                try {
                    const snapshotResponse = await options.conversationFacade.getSnapshot();
                    setProviderLabel(formatProviderLabel(snapshotResponse.conversation.provider));
                    setMessages(mapConversationSnapshot(snapshotResponse.conversation));
                } catch {
                    // Keep the latest rendered transcript if snapshot refresh also fails.
                }
                const details = error instanceof Error ? error.message : String(error);
                model.setError(`Explanation unavailable for \`${options.command}\`: ${details}`);
            }
        },
        [model, refreshExecutionBlocks, workspaceId],
    );

    const handleConfirmRunApproval = useCallback(
        async (approvalId: string) => {
            const pendingApproval =
                pendingRunApprovals.find((approval) => approval.approvalId === approvalId) ??
                (() => {
                    const storedApproval = getStoredPendingRunApproval(approvalId);
                    if (storedApproval == null) {
                        return null;
                    }
                    if (workspaceId && storedApproval.toolContext.workspace_id !== workspaceId) {
                        return null;
                    }
                    return toPendingRunApprovalEntry(storedApproval);
                })();
            if (pendingApproval == null || status !== "ready") {
                return;
            }

            setStatus("submitted");
            model.clearError();
            setPendingRunApprovals((previous) =>
                previous.map((approval) =>
                    approval.approvalId === approvalId
                        ? {
                              ...approval,
                              confirming: true,
                              errorMessage: undefined,
                          }
                        : approval,
                ),
            );

            try {
                const [toolsFacade, terminalFacade, conversationFacade] = await Promise.all([
                    getToolsFacade(),
                    getTerminalFacade(),
                    getConversationFacade(),
                ]);
                const confirmResponse = await toolsFacade.confirmApproval(approvalId, pendingApproval.toolContext);
                const approvalGrant = getApprovalGrant(confirmResponse);
                if (approvalGrant == null) {
                    if (confirmResponse.status === "error" && isStalePendingApprovalError(confirmResponse.error)) {
                        clearStoredPendingRunApproval(approvalId);
                        setPendingRunApprovals((previous) => replacePendingRunApproval(previous, approvalId, null));
                        model.setError(
                            "Pending approval is no longer available. Re-run the command to request approval again.",
                        );
                        return;
                    }
                    setPendingRunApprovals((previous) =>
                        previous.map((approval) =>
                            approval.approvalId === approvalId
                                ? {
                                      ...approval,
                                      confirming: false,
                                      errorMessage: buildApprovalConfirmErrorMessage(confirmResponse),
                                  }
                                : approval,
                        ),
                    );
                    return;
                }

                const executionResult = await executeRunCommandPrompt({
                    terminalFacade,
                    toolsFacade,
                    command: pendingApproval.command,
                    context: pendingApproval.toolContext,
                    approvalToken: approvalGrant.approval_token,
                });

                if (executionResult.kind === "approval_required") {
                    const nextApproval: StoredPendingRunApproval = {
                        ...pendingApproval,
                        approvalId: executionResult.pendingApproval.id,
                        summary: executionResult.pendingApproval.summary,
                        approvalTier: executionResult.pendingApproval.approval_tier,
                    };
                    replaceStoredPendingRunApproval(approvalId, nextApproval);
                    setPendingRunApprovals((previous) =>
                        replacePendingRunApproval(previous, approvalId, {
                            ...toPendingRunApprovalEntry(nextApproval),
                            confirming: false,
                            errorMessage: undefined,
                        }),
                    );
                    return;
                }

                clearStoredPendingRunApproval(approvalId);
                setPendingRunApprovals((previous) => replacePendingRunApproval(previous, approvalId, null));

                if (executionResult.kind === "tool_error") {
                    setMessages((previous) => [...previous, executionResult.resultMessage]);
                    return;
                }

                await completeRunCommandExecution({
                    conversationFacade,
                    prompt: pendingApproval.prompt,
                    command: pendingApproval.command,
                    context: {
                        ...pendingApproval.conversationContext,
                        action_source: "ai.panel.run_command.explain",
                    },
                    approvalUsed: true,
                    executionResult,
                });
            } catch (error) {
                if (isStalePendingApprovalError(error)) {
                    clearStoredPendingRunApproval(approvalId);
                    setPendingRunApprovals((previous) => replacePendingRunApproval(previous, approvalId, null));
                    model.setError("Pending approval is no longer available. Re-run the command to request approval again.");
                    return;
                }
                setPendingRunApprovals((previous) =>
                    previous.map((approval) =>
                        approval.approvalId === approvalId
                            ? {
                                  ...approval,
                                  confirming: false,
                                  errorMessage: error instanceof Error ? error.message : String(error),
                              }
                            : approval,
                    ),
                );
            } finally {
                setStatus("ready");
                setTimeout(() => {
                    model.focusInput();
                }, 100);
            }
        },
        [completeRunCommandExecution, model, pendingRunApprovals, status, workspaceId],
    );

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();

            const input = globalStore.get(model.inputAtom)?.trim() ?? "";
            const droppedFiles = globalStore.get(model.droppedFiles);
            const attachmentReferences = droppedFiles
                .map((file) => file.attachmentReference)
                .filter((reference): reference is AttachmentReference => reference != null);

            if (input === "") {
                return;
            }
            if (status !== "ready") {
                return;
            }
            if (droppedFiles.length > attachmentReferences.length) {
                model.setError(
                    "Some selected files do not have a local attachment reference yet. Re-attach them from local files and retry.",
                );
                return;
            }
            if (droppedFiles.some((file) => file.attachmentState === "missing")) {
                model.setError(
                    "One or more local attachment references are missing on disk. Remove or re-attach those files before sending.",
                );
                return;
            }

            setStatus("submitted");
            model.clearError();

            try {
                const facade = await getConversationFacade();
                const context = buildCompatConversationContext(repoRoot, "ai.panel.submit_message");
                const toolContext = buildToolExecutionContext(repoRoot, "ai.panel.run_command");
                const runCommand = parseRunCommandPrompt(input);
                if (runCommand?.kind === "invalid") {
                    model.setError(runCommand.message);
                    return;
                }
                if (runCommand?.kind === "run") {
                    const [toolsFacade, terminalFacade] = await Promise.all([getToolsFacade(), getTerminalFacade()]);
                    globalStore.set(model.inputAtom, "");
                    model.clearFiles();
                    const executionResult = await executeRunCommandPrompt({
                        terminalFacade,
                        toolsFacade,
                        command: runCommand.command,
                        context: toolContext,
                    });
                    if (executionResult.kind === "approval_required") {
                        const pendingApproval: StoredPendingRunApproval = {
                            approvalId: executionResult.pendingApproval.id,
                            prompt: runCommand.prompt,
                            command: runCommand.command,
                            summary: executionResult.pendingApproval.summary,
                            approvalTier: executionResult.pendingApproval.approval_tier,
                            toolContext,
                            conversationContext: buildConversationContextFromToolContext(
                                toolContext,
                                "ai.panel.run_command.explain",
                            ),
                        };
                        storePendingRunApproval(pendingApproval);
                        setPendingRunApprovals((previous) => [
                            ...previous,
                            toPendingRunApprovalEntry(pendingApproval),
                        ]);
                        return;
                    }
                    if (executionResult.kind === "tool_error") {
                        setMessages((previous) => [...previous, executionResult.resultMessage]);
                        return;
                    }
                    await completeRunCommandExecution({
                        conversationFacade: facade,
                        prompt: runCommand.prompt,
                        command: runCommand.command,
                        context: buildConversationContextFromToolContext(toolContext, "ai.panel.run_command.explain"),
                        executionResult,
                    });
                    return;
                }
                const response = await facade.submitMessage({
                    prompt: input,
                    context,
                    attachments: attachmentReferences,
                });
                setMessages(mapConversationSnapshot(response.conversation));
                setProviderLabel(formatProviderLabel(response.conversation.provider));
                globalStore.set(model.inputAtom, "");
                model.clearFiles();
            } catch (error) {
                if (error instanceof ApiError && error.code === "attachment_not_found") {
                    const missingPath = parseMissingAttachmentPath(error.message);
                    if (missingPath !== "") {
                        model.markAttachmentReferenceMissing(missingPath);
                    }
                    model.setError(
                        "A local attachment file is no longer available on disk. Re-attach the file and retry.",
                    );
                    return;
                }
                model.setError(error instanceof Error ? error.message : String(error));
            } finally {
                setStatus("ready");
                setTimeout(() => {
                    model.focusInput();
                }, 100);
            }
        },
        [completeRunCommandExecution, model, repoRoot, status]
    );

    const hasFilesDragged = (dataTransfer: DataTransfer): boolean => {
        return dataTransfer.types.includes("Files");
    };

    const handleDragOver = (event: React.DragEvent) => {
        const hasFiles = hasFilesDragged(event.dataTransfer);
        if (!hasFiles) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (!isDragOver) {
            setIsDragOver(true);
        }
    };

    const handleDragEnter = (event: React.DragEvent) => {
        const hasFiles = hasFilesDragged(event.dataTransfer);
        if (!hasFiles) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (event: React.DragEvent) => {
        const hasFiles = hasFilesDragged(event.dataTransfer);
        if (!hasFiles) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();

        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = event.clientX;
        const y = event.clientY;

        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDragOver(false);
        }
    };

    const handleDrop = async (event: React.DragEvent) => {
        if (!event.dataTransfer.files.length) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setIsDragOver(false);

        const files = Array.from(event.dataTransfer.files);
        const acceptableFiles = files.filter(isAcceptableFile);

        for (const file of acceptableFiles) {
            const sizeError = validateFileSize(file);
            if (sizeError) {
                model.setError(formatFileSizeError(sizeError));
                return;
            }
        }

        await attachLocalFiles(acceptableFiles);

        if (acceptableFiles.length < files.length) {
            const rejectedCount = files.length - acceptableFiles.length;
            const rejectedFiles = files.filter((file) => !isAcceptableFile(file));
            const fileNames = rejectedFiles.map((file) => file.name).join(", ");
            model.setError(
                `${rejectedCount} file${rejectedCount > 1 ? "s" : ""} rejected (unsupported type): ${fileNames}. Supported: images, PDFs, and text/code files.`
            );
        }
    };

    const handleFileItemDrop = useCallback(
        (draggedFile: DraggedFile) => {
            void addAttachmentReferenceByPath(draggedFile.uri, null);
        },
        [addAttachmentReferenceByPath]
    );

    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: "FILE_ITEM",
            drop: handleFileItemDrop,
            collect: (monitor) => ({
                isOver: monitor.isOver(),
                canDrop: monitor.canDrop(),
            }),
        }),
        [handleFileItemDrop]
    );

    useEffect(() => {
        setIsReactDndDragOver(isOver && canDrop);
    }, [canDrop, isOver]);

    useEffect(() => {
        if (containerRef.current) {
            drop(containerRef.current);
        }
    }, [drop]);

    const handleFocusCapture = useCallback(() => {
        model.requestWaveAIFocus();
    }, [model]);

    const handleClick = (event: React.MouseEvent) => {
        const target = event.target as HTMLElement;
        const isInteractive = target.closest('button, a, input, textarea, select, [role="button"], [tabindex]');

        if (isInteractive) {
            return;
        }

        const hasSelection = waveAIHasSelection();
        if (hasSelection) {
            model.requestWaveAIFocus();
            return;
        }

        setTimeout(() => {
            if (!waveAIHasSelection()) {
                model.focusInput();
            }
        }, 0);
    };

    const selectorSlot = (
        <AgentSelectionStrip
            catalog={catalog}
            disabled={selectionBusy || status !== "ready"}
            onSelectProfile={(id) => void handleSelectionChange("profile", id)}
            onSelectRole={(id) => void handleSelectionChange("role", id)}
            onSelectMode={(id) => void handleSelectionChange("mode", id)}
        />
    );

    return (
        <div
            ref={containerRef}
            data-waveai-panel="true"
            className={cn(
                "@container bg-zinc-900/70 flex flex-col relative",
                model.inBuilder ? "mt-0 h-full" : "mt-1 h-[calc(100%-4px)]",
                (isDragOver || isReactDndDragOver) && "bg-zinc-800 border-accent",
                isFocused ? "border-2 border-accent" : "border-2 border-transparent"
            )}
            style={{
                borderTopRightRadius: model.inBuilder ? 0 : 10,
                borderBottomRightRadius: model.inBuilder ? 0 : 10,
                borderBottomLeftRadius: 10,
            }}
            onFocusCapture={handleFocusCapture}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            inert={!isPanelVisible ? true : undefined}
        >
            {(isDragOver || isReactDndDragOver) && <AIDragOverlay />}
            {showBlockMask && <AIBlockMask />}
            <AIPanelHeader />

            <div key="main-content" className="flex-1 flex flex-col min-h-0">
                {messages.length === 0 && initialLoadDone ? (
                    <div
                        className="flex-1 overflow-y-auto p-2 relative"
                        onContextMenu={(event) => void handleWaveAIContextMenu(event, true)}
                    >
                        <div className="absolute top-2 left-2 right-2 z-10">{selectorSlot}</div>
                        <div className="pt-28">
                            <CompatConversationWelcome
                                providerLabel={providerLabel}
                                selectionSummary={formatSelectionSummary(catalog)}
                            />
                        </div>
                    </div>
                ) : (
                    <AIPanelMessages
                        messages={messages}
                        status={status}
                        selectorSlot={selectorSlot}
                        onContextMenu={(event) => void handleWaveAIContextMenu(event, true)}
                    />
                )}
                <CompatAIErrorMessage />
                <ExecutionBlockList blocks={executionBlocks} />
                <RunCommandApprovalList
                    approvals={pendingRunApprovals}
                    busy={status !== "ready"}
                    onConfirm={(approvalId) => void handleConfirmRunApproval(approvalId)}
                />
                <AIDroppedFiles model={model} />
                <AIPanelInput onSubmit={handleSubmit} status={status} model={model} onAttachFiles={attachLocalFiles} />
            </div>
        </div>
    );
});

AIPanelCompatInner.displayName = "AIPanelCompatInner";

export const AIPanelCompat = memo(() => {
    return <AIPanelCompatInner />;
});

AIPanelCompat.displayName = "AIPanelCompat";
