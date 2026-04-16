import { getFSFacade } from "@/compat";
import { getConversationFacade } from "@/compat/conversation";
import { WaveAIModel } from "@/app/aipanel/waveai-model";
import type { FSNode } from "@/rterm-api/fs/types";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
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
import { memo, useEffect, useState } from "react";

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
        setPreviewText("");
        setPreviewAvailable(false);
        setPreviewTruncated(false);
        setPreviewError(null);
        setAttachStatus(null);
        setAttachError(null);
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
            const response = await conversationFacade.createAttachmentReference({ path: filePath });
            const reference = response.attachment;
            const model = WaveAIModel.getInstance();
            const attachmentFile = new File([], reference.name, {
                type: reference.mime_type || "application/octet-stream",
            });
            await model.addReferencedFile(attachmentFile, reference, reference.path);
            WorkspaceLayoutModel.getInstance().setAIPanelVisible(true);
            setAttachStatus(`Attached to AI context: ${reference.name}`);
        } catch (error) {
            setAttachError(error instanceof Error ? error.message : String(error));
        } finally {
            setAttachBusy(false);
        }
    };

    const loadFilePreview = async (filePath: string) => {
        setPreviewLoading(true);
        setPreviewError(null);
        setAttachStatus(null);
        setAttachError(null);
        setSelectedFilePath(filePath);
        try {
            const facade = await getFSFacade();
            const response = await facade.read(filePath, 8192);
            setSelectedFilePath(response.path);
            setPreviewText(response.preview ?? "");
            setPreviewAvailable(response.preview_available === true);
            setPreviewTruncated(response.truncated === true);
        } catch (error) {
            setPreviewText("");
            setPreviewAvailable(false);
            setPreviewTruncated(false);
            setPreviewError(error instanceof Error ? error.message : String(error));
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

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-3 z-50 w-[28rem]"
            >
                <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="text-sm font-medium text-white">Files</div>
                    <div className="flex items-center gap-1">
                        <button
                            className="text-xs px-2 py-1 rounded border border-border text-secondary disabled:opacity-50"
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
                            className="text-xs px-2 py-1 rounded border border-border text-secondary disabled:opacity-50"
                            disabled={loading}
                            onClick={() => void loadPath(path)}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                <div className="text-[11px] text-secondary mb-2 break-all">{path || "Loading workspace path..."}</div>

                {loading ? (
                    <div className="flex items-center justify-center p-6">
                        <i className="fa fa-solid fa-spinner fa-spin text-xl text-muted"></i>
                    </div>
                ) : loadError ? (
                    <div className="text-sm text-red-400 whitespace-pre-wrap">{loadError}</div>
                ) : (
                    <div>
                        <div className="max-h-[18rem] overflow-y-auto border border-border rounded">
                            <div className="px-3 py-2 text-[11px] text-secondary border-b border-border">Directories</div>
                            {directories.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted border-b border-border">No directories</div>
                            ) : (
                                directories.map((directory) => (
                                    <button
                                        key={`dir:${directory.name}`}
                                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-hoverbg border-b border-border last:border-b-0"
                                        onClick={() => void loadPath(joinPath(path, directory.name))}
                                    >
                                        <i className="fa fa-folder mr-2 text-amber-300"></i>
                                        {directory.name}
                                    </button>
                                ))
                            )}
                            <div className="px-3 py-2 text-[11px] text-secondary border-y border-border">Files</div>
                            {files.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted">No files</div>
                            ) : (
                                files.map((file) => {
                                    const filePath = joinPath(path, file.name);
                                    const isSelected = selectedFilePath === filePath;
                                    return (
                                        <button
                                            key={`file:${file.name}`}
                                            className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-b-0 ${
                                                isSelected ? "bg-hoverbg text-white" : "text-secondary hover:bg-hoverbg"
                                            }`}
                                            onClick={() => void loadFilePreview(filePath)}
                                        >
                                            <i className="fa fa-file mr-2"></i>
                                            {file.name}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                        <div className="mt-3 text-[11px] text-secondary">Selected path</div>
                        <div className="text-xs text-white/90 break-all border border-border rounded px-2 py-1.5 mt-1 min-h-[2rem]">
                            {selectedFilePath || "No file selected"}
                        </div>
                        <button
                            className="mt-2 text-xs px-2 py-1 rounded border border-border text-secondary disabled:opacity-50"
                            disabled={selectedFilePath === "" || previewLoading || attachBusy}
                            onClick={() => void attachFileContext(selectedFilePath)}
                        >
                            {attachBusy ? "Attaching..." : "Attach Selected File To AI Context"}
                        </button>
                        <div className="mt-2 text-[11px] text-secondary">Preview (text, bounded)</div>
                        <div className="border border-border rounded mt-1 p-2 max-h-[9rem] overflow-auto bg-black/20">
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
                                <div className="text-[11px] text-amber-300 mt-2">Preview truncated to 8192 bytes.</div>
                            ) : null}
                            {attachStatus ? (
                                <div className="text-[11px] text-emerald-300 mt-2 whitespace-pre-wrap">{attachStatus}</div>
                            ) : null}
                            {attachError ? (
                                <div className="text-[11px] text-red-300 mt-2 whitespace-pre-wrap">{attachError}</div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </FloatingPortal>
    );
});

FilesFloatingWindow.displayName = "FilesFloatingWindow";

export { FilesFloatingWindow };
