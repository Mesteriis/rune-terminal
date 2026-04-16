import { getFSFacade } from "@/compat";
import type { FSNode } from "@/rterm-api/fs/types";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
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
                    <div className="max-h-[26rem] overflow-y-auto border border-border rounded">
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
                            files.map((file) => (
                                <div key={`file:${file.name}`} className="px-3 py-2 text-sm text-secondary border-b border-border last:border-b-0">
                                    <i className="fa fa-file mr-2"></i>
                                    {file.name}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </FloatingPortal>
    );
});

FilesFloatingWindow.displayName = "FilesFloatingWindow";

export { FilesFloatingWindow };
