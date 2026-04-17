import { getFSFacade } from "@/compat";
import { getConversationFacade } from "@/compat/conversation";
import { WaveAIModel } from "@/app/aipanel/waveai-model";
import { workspaceStore } from "@/app/state/workspace.store";
import { globalStore } from "@/app/store/jotaiStore";
import type { FSNode } from "@/rterm-api/fs/types";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { formatRemoteUri } from "@/util/waveutil";
import { clearActiveFilePath, setActiveFilePath } from "./active-context";
import { WorkspaceLayoutModel } from "./workspace-layout-model";
import {
    FloatingPortal,
    autoUpdate,
    offset,
    shift,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import { useDrag } from "react-dnd";
import { memo, useCallback, useEffect, useState } from "react";
import { UtilitySurfaceFrame } from "./utility-surface-frame";

function joinPath(base: string, name: string): string {
    if (base.endsWith("/") || base.endsWith("\\")) {
        return `${base}${name}`;
    }
    const separator = base.includes("\\") && !base.includes("/") ? "\\" : "/";
    return `${base}${separator}${name}`;
}

function parentPath(path: string): string | null {
    const normalized = path.replace(/[\\/]+$/, "");
    if (normalized === "" || normalized === "/") {
        return null;
    }
    if (/^[A-Za-z]:$/.test(normalized)) {
        return null;
    }

    const lastForwardSlash = normalized.lastIndexOf("/");
    const lastBackSlash = normalized.lastIndexOf("\\");
    const lastSeparator = Math.max(lastForwardSlash, lastBackSlash);
    if (lastSeparator <= 0) {
        if (/^[A-Za-z]:/.test(normalized)) {
            return `${normalized.slice(0, 2)}\\`;
        }
        return "/";
    }

    const parent = normalized.slice(0, lastSeparator);
    if (/^[A-Za-z]:$/.test(parent)) {
        return `${parent}\\`;
    }
    return parent || "/";
}

function quotePathForShell(path: string): string {
    return `'${path.replaceAll("'", `'\\''`)}'`;
}

function buildRunPromptFromSelection(currentInput: string, filePath: string): string {
    const trimmedInput = currentInput.trim();
    const quotedPath = quotePathForShell(filePath);
    if (trimmedInput.startsWith("/run ") || trimmedInput.startsWith("run:")) {
        return `${trimmedInput} ${quotedPath}`;
    }
    return `/run cat ${quotedPath}`;
}

function activeRemoteConnectionID(): string | null {
    const workspaceSnapshot = workspaceStore.getSnapshot();
    const activeWidget = workspaceSnapshot.active.widgets[workspaceSnapshot.active.activewidgetid];
    if (!activeWidget || activeWidget.kind !== "terminal") {
        return null;
    }
    const connectionID = activeWidget.connectionId?.trim();
    if (!connectionID || connectionID === "" || connectionID === "local" || connectionID.startsWith("local:")) {
        return null;
    }
    return connectionID;
}

interface FilesFloatingEntryProps {
    kind: "directory" | "file";
    name: string;
    fullPath: string;
    parentPath: string;
    onClick: () => void;
    selected?: boolean;
}

const FilesFloatingEntry = memo(({ kind, name, fullPath, parentPath, onClick, selected = false }: FilesFloatingEntryProps) => {
    const dragItem: DraggedFile = {
        relName: name,
        absParent: parentPath,
        uri: formatRemoteUri(fullPath, "local"),
        isDir: kind === "directory",
    };
    const [_, drag] = useDrag(
        () => ({
            type: "FILE_ITEM",
            canDrag: true,
            item: () => dragItem,
        }),
        [dragItem]
    );
    const dragRef = useCallback(
        (node: HTMLButtonElement | null) => {
            drag(node);
        },
        [drag]
    );

    const baseClass =
        kind === "directory"
            ? "w-full text-left px-3 py-2 text-sm text-white hover:bg-hoverbg border-b border-border last:border-b-0"
            : `w-full text-left px-3 py-2 text-sm border-b border-border last:border-b-0 ${
                  selected ? "bg-hoverbg text-white" : "text-secondary hover:bg-hoverbg"
              }`;

    return (
        <button ref={dragRef} className={baseClass} onClick={onClick} data-testid={`files-entry-${kind}-${name}`}>
            <i className={`fa ${kind === "directory" ? "fa-folder text-amber-300" : "fa-file"} mr-2`}></i>
            {name}
        </button>
    );
});

FilesFloatingEntry.displayName = "FilesFloatingEntry";

const FilesFloatingWindow = memo(({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
    const [path, setPath] = useState("");
    const [directories, setDirectories] = useState<FSNode[]>([]);
    const [files, setFiles] = useState<FSNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedFilePath, setSelectedFilePath] = useState("");
    const [previewText, setPreviewText] = useState("");
    const [previewAvailable, setPreviewAvailable] = useState(false);
    const [previewTruncated, setPreviewTruncated] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [attachStatus, setAttachStatus] = useState<string | null>(null);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [attachBusy, setAttachBusy] = useState(false);
    const [runPromptPreview, setRunPromptPreview] = useState<string | null>(null);

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

    const loadPath = async (nextPath?: string) => {
        setLoading(true);
        setLoadError(null);
        setSelectedFilePath("");
        clearActiveFilePath();
        setPreviewText("");
        setPreviewAvailable(false);
        setPreviewTruncated(false);
        setPreviewError(null);
        setAttachStatus(null);
        setAttachError(null);
        setRunPromptPreview(null);
        try {
            const facade = await getFSFacade();
            const response = await facade.list(nextPath);
            setPath(response.path);
            setDirectories(response.directories ?? []);
            setFiles(response.files ?? []);
        } catch (error) {
            setLoadError(error instanceof Error ? error.message : String(error));
            setDirectories([]);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const attachFileContext = async (filePath: string) => {
        setAttachBusy(true);
        setAttachStatus(null);
        setAttachError(null);
        try {
            const conversationFacade = await getConversationFacade();
            const workspaceID = workspaceStore.getSnapshot().active.oid?.trim() || undefined;
            const response = await conversationFacade.createAttachmentReference({
                path: filePath,
                workspace_id: workspaceID,
                action_source: "workspace.files.attach_to_ai",
            });
            const reference = response.attachment;
            const model = WaveAIModel.getInstance();
            const attachmentFile = new File([], reference.name, {
                type: reference.mime_type || "application/octet-stream",
            });
            await model.addReferencedFile(attachmentFile, reference, reference.path);
            WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
            setAttachStatus(`Attached to AI context: ${reference.name}`);
            setRunPromptPreview(null);
        } catch (error) {
            setAttachError(error instanceof Error ? error.message : String(error));
        } finally {
            setAttachBusy(false);
        }
    };

    const insertSelectedPathInAIPrompt = (filePath: string) => {
        const model = WaveAIModel.getInstance();
        const currentInput = globalStore.get(model.inputAtom)?.trim() ?? "";
        const nextInput = currentInput === "" ? filePath : `${currentInput} ${filePath}`;
        globalStore.set(model.inputAtom, nextInput);
        WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
        model.focusInput();
        setAttachStatus("Inserted selected path into AI composer input.");
        setAttachError(null);
        setRunPromptPreview(null);
    };

    const insertSelectedPathInRunPrompt = (filePath: string) => {
        const model = WaveAIModel.getInstance();
        const currentInput = globalStore.get(model.inputAtom) ?? "";
        const nextInput = buildRunPromptFromSelection(currentInput, filePath);
        globalStore.set(model.inputAtom, nextInput);
        WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
        model.focusInput();
        setAttachStatus("Prepared /run prompt with selected file path. Nothing was executed automatically.");
        setAttachError(null);
        setRunPromptPreview(nextInput);
    };

    const insertSelectedPathInRemoteRunPrompt = (filePath: string) => {
        const remoteConnectionID = activeRemoteConnectionID();
        if (remoteConnectionID == null) {
            setAttachStatus(null);
            setAttachError("Remote /run path helper requires an active remote terminal tab.");
            return;
        }
        const model = WaveAIModel.getInstance();
        const currentInput = globalStore.get(model.inputAtom) ?? "";
        const nextInput = buildRunPromptFromSelection(currentInput, filePath);
        globalStore.set(model.inputAtom, nextInput);
        WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
        model.focusInput();
        setAttachStatus(
            `Prepared /run prompt for remote target ${remoteConnectionID}. Nothing was executed automatically.`,
        );
        setAttachError(null);
        setRunPromptPreview(nextInput);
    };

    const loadFilePreview = async (filePath: string) => {
        setPreviewLoading(true);
        setPreviewError(null);
        setAttachStatus(null);
        setAttachError(null);
        setSelectedFilePath(filePath);
        setActiveFilePath(filePath);
        try {
            const facade = await getFSFacade();
            const response = await facade.read(filePath, 8192);
            setSelectedFilePath(response.path);
            setActiveFilePath(response.path);
            setPreviewText(response.preview ?? "");
            setPreviewAvailable(response.preview_available === true);
            setPreviewTruncated(response.truncated === true);
        } catch (error) {
            setPreviewText("");
        setPreviewAvailable(false);
        setPreviewTruncated(false);
        setPreviewError(error instanceof Error ? error.message : String(error));
        clearActiveFilePath();
        setRunPromptPreview(null);
    } finally {
        setPreviewLoading(false);
    }
    };

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        void loadPath(undefined);
    }, [isOpen]);

    if (!isOpen) return null;

    const canGoUp = parentPath(path) != null;
    const remoteConnectionID = activeRemoteConnectionID();

    return (
        <FloatingPortal>
            <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} className="z-50">
                <UtilitySurfaceFrame
                    title="Files"
                    icon="folder-open"
                    onClose={onClose}
                    widthClassName="w-[min(92vw,29rem)] max-w-[29rem]"
                    testID="files-surface"
                    headerActions={
                        <div className="flex items-center gap-1">
                            <button
                                className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                disabled={!canGoUp || loading}
                                onClick={() => {
                                    const upPath = parentPath(path);
                                    if (upPath != null) {
                                        void loadPath(upPath);
                                    }
                                }}
                            >
                                Up
                            </button>
                            <button
                                className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                disabled={loading}
                                onClick={() => void loadPath(path)}
                            >
                                Refresh
                            </button>
                        </div>
                    }
                >
                    <div className="min-h-0 overflow-y-auto p-3">
                        <div className="mb-2 break-all text-[11px] text-secondary">{path || "Loading workspace path..."}</div>
                        {loading ? (
                            <div className="flex items-center justify-center p-6">
                                <i className="fa fa-solid fa-spinner fa-spin text-xl text-muted"></i>
                            </div>
                        ) : loadError ? (
                            <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                        ) : (
                            <div>
                                <div className="max-h-[18rem] overflow-y-auto rounded border border-border">
                                    <div className="border-b border-border px-3 py-2 text-[11px] text-secondary">Directories</div>
                                    {directories.length === 0 ? (
                                        <div className="border-b border-border px-3 py-2 text-xs text-muted">No directories</div>
                                    ) : (
                                        directories.map((directory) => (
                                            <FilesFloatingEntry
                                                key={`dir:${directory.name}`}
                                                kind="directory"
                                                name={directory.name}
                                                fullPath={joinPath(path, directory.name)}
                                                parentPath={path}
                                                onClick={() => void loadPath(joinPath(path, directory.name))}
                                            />
                                        ))
                                    )}
                                    <div className="border-y border-border px-3 py-2 text-[11px] text-secondary">Files</div>
                                    {files.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-muted">No files</div>
                                    ) : (
                                        files.map((file) => {
                                            const filePath = joinPath(path, file.name);
                                            const isSelected = selectedFilePath === filePath;
                                            return (
                                                <FilesFloatingEntry
                                                    key={`file:${file.name}`}
                                                    kind="file"
                                                    name={file.name}
                                                    fullPath={filePath}
                                                    parentPath={path}
                                                    selected={isSelected}
                                                    onClick={() => void loadFilePreview(filePath)}
                                                />
                                            );
                                        })
                                    )}
                                </div>
                                <div className="mt-3 text-[11px] text-secondary">Selected path</div>
                                <div className="mt-1 min-h-[2rem] break-all rounded border border-border px-2 py-1.5 text-xs text-white/90">
                                    {selectedFilePath || "No file selected"}
                                </div>
                                <div className="mt-2 text-[11px] text-secondary">
                                    Active terminal target: {remoteConnectionID ? `remote (${remoteConnectionID})` : "local"}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                        disabled={selectedFilePath === "" || previewLoading || attachBusy}
                                        onClick={() => void attachFileContext(selectedFilePath)}
                                    >
                                        {attachBusy ? "Attaching..." : "Attach Selected File To AI Context"}
                                    </button>
                                    <button
                                        className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                        disabled={selectedFilePath === "" || previewLoading || attachBusy}
                                        onClick={() => insertSelectedPathInAIPrompt(selectedFilePath)}
                                    >
                                        Use Selected Path In AI Prompt
                                    </button>
                                    <button
                                        className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                        disabled={selectedFilePath === "" || previewLoading || attachBusy}
                                        onClick={() => insertSelectedPathInRunPrompt(selectedFilePath)}
                                    >
                                        Use Selected Path In /run Prompt
                                    </button>
                                    <button
                                        className="rounded border border-border px-2 py-1 text-xs text-secondary disabled:opacity-50"
                                        disabled={selectedFilePath === "" || previewLoading || attachBusy || remoteConnectionID == null}
                                        onClick={() => insertSelectedPathInRemoteRunPrompt(selectedFilePath)}
                                    >
                                        Use Selected Path In Remote /run Prompt
                                    </button>
                                </div>
                                {runPromptPreview ? (
                                    <>
                                        <div className="mt-2 text-[11px] text-secondary">Prepared /run prompt (not sent)</div>
                                        <pre className="mt-1 rounded border border-border bg-black/20 px-2 py-1.5 text-xs whitespace-pre-wrap break-words text-white/90">
                                            {runPromptPreview}
                                        </pre>
                                    </>
                                ) : null}
                                <div className="mt-2 text-[11px] text-secondary">Preview (text, bounded)</div>
                                <div className="mt-1 max-h-[9rem] overflow-auto rounded border border-border bg-black/20 p-2">
                                    {previewLoading ? (
                                        <div className="text-xs text-muted">Loading preview...</div>
                                    ) : previewError ? (
                                        <div className="text-xs text-red-400 whitespace-pre-wrap">{previewError}</div>
                                    ) : selectedFilePath === "" ? (
                                        <div className="text-xs text-muted">Select a file to reveal path and preview.</div>
                                    ) : !previewAvailable ? (
                                        <div className="text-xs text-muted">Preview unavailable for this file type.</div>
                                    ) : (
                                        <pre className="text-xs whitespace-pre-wrap break-words text-white/90">{previewText}</pre>
                                    )}
                                    {previewAvailable && previewTruncated ? (
                                        <div className="mt-2 text-[11px] text-amber-300">Preview truncated to 8192 bytes.</div>
                                    ) : null}
                                    {attachStatus ? (
                                        <div className="mt-2 whitespace-pre-wrap text-[11px] text-emerald-300">{attachStatus}</div>
                                    ) : null}
                                    {attachError ? (
                                        <div className="mt-2 whitespace-pre-wrap text-[11px] text-red-300">{attachError}</div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </UtilitySurfaceFrame>
            </div>
        </FloatingPortal>
    );
});

FilesFloatingWindow.displayName = "FilesFloatingWindow";

export { FilesFloatingWindow };
