import { getFSFacade } from "@/compat";
import type { FSNode } from "@/rterm-api/fs/types";
import { useEffect, useState, type ReactNode } from "react";

interface CompatFilesViewProps {
    widgetId: string;
    path: string;
    connectionId?: string;
    title?: string;
    headerActions?: ReactNode;
}

function isLocalConnection(connectionId?: string): boolean {
    return connectionId == null || connectionId === "" || connectionId === "local" || connectionId.startsWith("local:");
}

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

export function CompatFilesView({ widgetId, path, connectionId, title, headerActions }: CompatFilesViewProps) {
    const [currentPath, setCurrentPath] = useState(path);
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
    const remoteDirectory = !isLocalConnection(connectionId);

    const loadPath = async (nextPath: string) => {
        if (remoteDirectory) {
            setLoading(false);
            setCurrentPath(nextPath);
            setDirectories([]);
            setFiles([]);
            setLoadError(null);
            setSelectedFilePath("");
            setPreviewText("");
            setPreviewAvailable(false);
            setPreviewTruncated(false);
            setPreviewLoading(false);
            setPreviewError(null);
            return;
        }
        setLoading(true);
        setLoadError(null);
        setSelectedFilePath("");
        setPreviewText("");
        setPreviewAvailable(false);
        setPreviewTruncated(false);
        setPreviewError(null);
        try {
            const facade = await getFSFacade();
            const response = await facade.list(nextPath, { allowOutsideWorkspace: true });
            setCurrentPath(response.path);
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

    const loadFilePreview = async (filePath: string) => {
        if (remoteDirectory) {
            setPreviewLoading(false);
            return;
        }
        setPreviewLoading(true);
        setPreviewError(null);
        setSelectedFilePath(filePath);
        try {
            const facade = await getFSFacade();
            const response = await facade.read(filePath, 8192, { allowOutsideWorkspace: true });
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
        if (!path) {
            return;
        }
        if (remoteDirectory) {
            setLoading(false);
            setCurrentPath(path);
            setDirectories([]);
            setFiles([]);
            setLoadError(null);
            setSelectedFilePath("");
            setPreviewText("");
            setPreviewAvailable(false);
            setPreviewTruncated(false);
            setPreviewLoading(false);
            setPreviewError(null);
            return;
        }
        void loadPath(path);
    }, [path, remoteDirectory]);

    const canGoUp = parentPath(currentPath) != null;
    const viewTitle = title?.trim() || "Files";

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-black/20" data-testid={`compat-files-widget-${widgetId}`}>
            <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-black/10 px-3 py-2">
                <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <div className="flex shrink-0 items-center gap-1 text-[11px] text-secondary" title="Drag to rearrange files block">
                            <i className="fa fa-grip-vertical" />
                            <i className="fa fa-folder-open" />
                        </div>
                        <div className="truncate text-[12px] font-semibold text-white">{viewTitle}</div>
                        <span className="rounded-full border border-border bg-black/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                            {remoteDirectory ? "remote" : "local"}
                        </span>
                    </div>
                    <div className="mt-1 break-all text-[11px] text-secondary">{currentPath || path}</div>
                </div>
                <div className="flex items-center gap-2">
                    {headerActions}
                    <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-[11px] text-secondary disabled:opacity-50"
                        disabled={!canGoUp || loading || remoteDirectory}
                        onClick={() => {
                            const upPath = parentPath(currentPath);
                            if (upPath != null) {
                                void loadPath(upPath);
                            }
                        }}
                    >
                        Up
                    </button>
                    <button
                        type="button"
                        className="rounded border border-border px-2 py-1 text-[11px] text-secondary disabled:opacity-50"
                        disabled={loading || remoteDirectory}
                        onClick={() => void loadPath(currentPath)}
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {remoteDirectory ? (
                    <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                        This block preserves the terminal's remote path and connection context, but the active compat files view does not
                        browse remote filesystems yet. No remote file operations are executed implicitly.
                    </div>
                ) : null}

                {loading ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-secondary">Loading directory…</div>
                ) : loadError ? (
                    <div className="whitespace-pre-wrap rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {loadError}
                    </div>
                ) : (
                    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] gap-3">
                        <div className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-black/20">
                            <div className="border-b border-border px-3 py-2 text-[11px] text-secondary">Directories</div>
                            <div className="max-h-[40%] overflow-y-auto border-b border-border">
                                {directories.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted">No directories</div>
                                ) : (
                                    directories.map((directory) => (
                                        <button
                                            key={`dir:${directory.name}`}
                                            className="w-full border-b border-border px-3 py-2 text-left text-sm text-white last:border-b-0 hover:bg-hoverbg"
                                            onClick={() => void loadPath(joinPath(currentPath, directory.name))}
                                        >
                                            <i className="fa fa-folder mr-2 text-amber-300"></i>
                                            {directory.name}
                                        </button>
                                    ))
                                )}
                            </div>
                            <div className="border-b border-border px-3 py-2 text-[11px] text-secondary">Files</div>
                            <div className="flex-1 overflow-y-auto">
                                {files.length === 0 ? (
                                    <div className="px-3 py-2 text-xs text-muted">No files</div>
                                ) : (
                                    files.map((file) => {
                                        const filePath = joinPath(currentPath, file.name);
                                        const selected = filePath === selectedFilePath;
                                        return (
                                            <button
                                                key={`file:${file.name}`}
                                                className={`w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 ${
                                                    selected ? "bg-hoverbg text-white" : "text-secondary hover:bg-hoverbg"
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
                        </div>

                        <div className="flex min-h-0 flex-col gap-2 rounded border border-border bg-black/20 p-3">
                            <div className="text-[11px] text-secondary">Selected path</div>
                            <div className="min-h-[2.5rem] break-all rounded border border-border px-2 py-1.5 text-xs text-white/90">
                                {selectedFilePath || "No file selected"}
                            </div>
                            <div className="text-[11px] text-secondary">Preview (bounded)</div>
                            <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-black/30 p-2">
                                {previewLoading ? (
                                    <div className="text-xs text-muted">Loading preview...</div>
                                ) : remoteDirectory ? (
                                    <div className="text-xs text-muted">Remote directory browsing is not available in the active compat files view yet.</div>
                                ) : previewError ? (
                                    <div className="whitespace-pre-wrap text-xs text-red-300">{previewError}</div>
                                ) : selectedFilePath === "" ? (
                                    <div className="text-xs text-muted">Select a file to inspect its path and text preview.</div>
                                ) : !previewAvailable ? (
                                    <div className="text-xs text-muted">Preview unavailable for this file type.</div>
                                ) : (
                                    <pre className="whitespace-pre-wrap break-words text-xs text-white/90">{previewText}</pre>
                                )}
                                {previewAvailable && previewTruncated ? (
                                    <div className="mt-2 text-[11px] text-amber-300">Preview truncated to 8192 bytes.</div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
