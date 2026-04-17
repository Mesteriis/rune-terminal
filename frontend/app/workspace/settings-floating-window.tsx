import { useT } from "@/app/i18n/i18n";
import { workspaceStore, type WorkspaceStoreLayout } from "@/app/state/workspace.store";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { createBlock } from "@/store/global";
import { makeIconClass } from "@/util/util";
import { fireAndForget } from "@/util/util";
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

const surfaceConfig: Array<{ id: string; label: string; region: string }> = [
    { id: "ai", label: "AI", region: "sidebar" },
    { id: "tools", label: "Tools", region: "utility" },
    { id: "audit", label: "Audit", region: "utility" },
    { id: "mcp", label: "MCP", region: "utility" },
];

function hasSurface(layout: WorkspaceStoreLayout, surfaceID: string): boolean {
    return layout.surfaces.some((surface) => surface.id === surfaceID);
}

const SettingsFloatingWindow = memo(({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
    const t = useT();
    const [layout, setLayout] = useState<WorkspaceStoreLayout>(() => workspaceStore.getSnapshot().active.layout);
    const [layouts, setLayouts] = useState<WorkspaceStoreLayout[]>(() => workspaceStore.getSnapshot().active.layouts);
    const [activeLayoutId, setActiveLayoutId] = useState<string>(() => workspaceStore.getSnapshot().active.activeLayoutId);
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
        if (!isOpen) {
            return;
        }
        const current = workspaceStore.getSnapshot().active;
        setLayout(current.layout);
        setLayouts(current.layouts);
        setActiveLayoutId(current.activeLayoutId);
        const unsubscribe = workspaceStore.subscribe((snapshot) => {
            setLayout(snapshot.active.layout);
            setLayouts(snapshot.active.layouts);
            setActiveLayoutId(snapshot.active.activeLayoutId);
        });
        return () => unsubscribe();
    }, [isOpen]);

    if (!isOpen) return null;

    const applyLayout = (nextLayout: WorkspaceStoreLayout) => {
        setLayout(nextLayout);
        setActiveLayoutId(nextLayout.id);
        setLayouts((current) => {
            const next = [...current];
            const existingIndex = next.findIndex((entry) => entry.id === nextLayout.id);
            if (existingIndex >= 0) {
                next[existingIndex] = nextLayout;
            } else {
                next.push(nextLayout);
            }
            return next;
        });
        fireAndForget(() => workspaceStore.updateLayout(nextLayout));
    };

    const toggleSurface = (surfaceID: string, region: string, enabled: boolean) => {
        const nextSurfaces = enabled
            ? [...layout.surfaces, { id: surfaceID, region }]
            : layout.surfaces.filter((surface) => surface.id !== surfaceID);
        const dedupedSurfaces: WorkspaceStoreLayout["surfaces"] = [];
        const seen = new Set<string>();
        for (const surface of nextSurfaces) {
            if (seen.has(surface.id)) {
                continue;
            }
            seen.add(surface.id);
            dedupedSurfaces.push(surface);
        }
        const activeSurfaceId = dedupedSurfaces.some((surface) => surface.id === layout.activeSurfaceId)
            ? layout.activeSurfaceId
            : dedupedSurfaces[0]?.id ?? "terminal";
        applyLayout({
            ...layout,
            surfaces: dedupedSurfaces,
            activeSurfaceId,
        });
    };

    const menuItems = [
        {
            icon: "gear",
            label: t("workspace.menu.settings"),
            onClick: () => {
                const blockDef: BlockDef = {
                    meta: {
                        view: "waveconfig",
                    },
                };
                createBlock(blockDef, false, true);
                onClose();
            },
        },
        {
            icon: "lightbulb",
            label: t("workspace.menu.tips"),
            onClick: () => {
                const blockDef: BlockDef = {
                    meta: {
                        view: "tips",
                    },
                };
                createBlock(blockDef, true, true);
                onClose();
            },
        },
        {
            icon: "lock",
            label: t("workspace.menu.secrets"),
            onClick: () => {
                const blockDef: BlockDef = {
                    meta: {
                        view: "waveconfig",
                        file: "secrets",
                    },
                };
                createBlock(blockDef, false, true);
                onClose();
            },
        },
        {
            icon: "circle-question",
            label: t("workspace.menu.help"),
            onClick: () => {
                const blockDef: BlockDef = {
                    meta: {
                        view: "help",
                    },
                };
                createBlock(blockDef);
                onClose();
            },
        },
    ];

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-2 z-50 min-w-[18rem]"
            >
                <div className="px-3 py-2 border-b border-border mb-1">
                    <div className="text-xs font-medium text-white">Layout</div>
                    <div className="mt-2 flex items-center gap-2">
                        <button
                            type="button"
                            className="px-2 py-1 rounded border border-border text-[11px] text-secondary hover:text-white"
                            onClick={() => applyLayout({ ...layout, mode: "split" })}
                        >
                            Split
                        </button>
                        <button
                            type="button"
                            className="px-2 py-1 rounded border border-border text-[11px] text-secondary hover:text-white"
                            onClick={() => applyLayout({ ...layout, mode: "focus" })}
                        >
                            Focus
                        </button>
                        <select
                            className="min-w-0 flex-1 rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                            value={layout.activeSurfaceId}
                            onChange={(event) => applyLayout({ ...layout, activeSurfaceId: event.target.value })}
                        >
                            {layout.surfaces.map((surface) => (
                                <option key={surface.id} value={surface.id}>
                                    {surface.id}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                        {surfaceConfig.map((surface) => {
                            const enabled = hasSurface(layout, surface.id);
                            return (
                                <label key={surface.id} className="flex items-center gap-1.5 text-[11px] text-secondary">
                                    <input
                                        type="checkbox"
                                        checked={enabled}
                                        onChange={(event) => toggleSurface(surface.id, surface.region, event.target.checked)}
                                    />
                                    {surface.label}
                                </label>
                            );
                        })}
                    </div>
                    <div className="mt-3 pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                            <select
                                className="min-w-0 flex-1 rounded border border-border bg-black/20 p-1 text-[11px] text-white"
                                value={activeLayoutId}
                                onChange={(event) => {
                                    const nextLayoutID = event.target.value;
                                    setActiveLayoutId(nextLayoutID);
                                    fireAndForget(() => workspaceStore.switchLayout(nextLayoutID));
                                }}
                            >
                                {layouts.map((entry) => (
                                    <option key={entry.id} value={entry.id}>
                                        {entry.id}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="px-2 py-1 rounded border border-border text-[11px] text-secondary hover:text-white"
                                onClick={() => {
                                    fireAndForget(() => workspaceStore.saveLayout());
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
                {menuItems.map((item, idx) => (
                    <div
                        key={idx}
                        className="flex items-center gap-3 px-3 py-2 rounded hover:bg-hoverbg cursor-pointer transition-colors text-secondary hover:text-white"
                        onClick={item.onClick}
                    >
                        <div className="text-lg w-5 flex justify-center">
                            <i className={makeIconClass(item.icon, false)}></i>
                        </div>
                        <div className="text-sm whitespace-nowrap">{item.label}</div>
                    </div>
                ))}
            </div>
        </FloatingPortal>
    );
});

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";

export { SettingsFloatingWindow };
