import { waveAIHasSelection } from "@/app/aipanel/waveai-focus-utils";
import { atoms, getSettingsKeyAtom } from "@/app/store/global";
import { globalStore } from "@/app/store/jotaiStore";
import { createCompatApiFacade } from "@/compat/api";
import { getAgentFacade } from "@/compat/agent";
import { getConversationFacade } from "@/compat/conversation";
import { isMacOS, isWindows } from "@/util/platformutil";
import { cn } from "@/util/util";
import { useAtomValue } from "jotai";
import * as jotai from "jotai";
import type { AgentCatalog } from "@/rterm-api/agent/types";
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useDrop } from "react-dnd";
import { formatFileSizeError, isAcceptableFile, validateFileSize } from "./ai-utils";
import { AgentSelectionStrip } from "./agent-selection-strip";
import { AIDroppedFiles } from "./aidroppedfiles";
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
import { parseRunCommandPrompt, submitRunCommandPrompt } from "./run-command";
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

const AIPanelCompatInner = memo(() => {
    const [messages, setMessages] = useState<WaveUIMessage[]>([]);
    const [status, setStatus] = useState("ready");
    const [catalog, setCatalog] = useState<AgentCatalog | null>(null);
    const [repoRoot, setRepoRoot] = useState("");
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
            } else {
                setRepoRoot("");
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
    }, [model]);

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

    const handleSubmit = useCallback(
        async (event: React.FormEvent) => {
            event.preventDefault();

            const input = globalStore.get(model.inputAtom)?.trim() ?? "";
            const droppedFiles = globalStore.get(model.droppedFiles);

            if (input === "") {
                return;
            }
            if (status !== "ready") {
                return;
            }
            if (droppedFiles.length > 0) {
                model.setError("Attachment transport is not wired into the active compat conversation path yet.");
                return;
            }

            setStatus("submitted");
            model.clearError();

            try {
                const facade = await getConversationFacade();
                const context = buildCompatConversationContext(repoRoot);
                const runCommand = parseRunCommandPrompt(input);
                if (runCommand?.kind === "invalid") {
                    model.setError(runCommand.message);
                    return;
                }
                const response =
                    runCommand?.kind === "run"
                        ? await submitRunCommandPrompt({
                              conversationFacade: facade,
                              prompt: runCommand.prompt,
                              context,
                          })
                        : await facade.submitMessage({
                              prompt: input,
                              context,
                          });
                setMessages(mapConversationSnapshot(response.conversation));
                setProviderLabel(formatProviderLabel(response.conversation.provider));
                globalStore.set(model.inputAtom, "");
                model.clearFiles();
            } catch (error) {
                model.setError(error instanceof Error ? error.message : String(error));
            } finally {
                setStatus("ready");
                setTimeout(() => {
                    model.focusInput();
                }, 100);
            }
        },
        [model, repoRoot, status]
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
            await model.addFile(file);
        }

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
            model.addFileFromRemoteUri(draggedFile);
        },
        [model]
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
                <AIDroppedFiles model={model} />
                <AIPanelInput onSubmit={handleSubmit} status={status} model={model} />
            </div>
        </div>
    );
});

AIPanelCompatInner.displayName = "AIPanelCompatInner";

export const AIPanelCompat = memo(() => {
    return <AIPanelCompatInner />;
});

AIPanelCompat.displayName = "AIPanelCompat";
