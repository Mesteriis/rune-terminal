import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { RpcApi } from "@/app/store/wshclientapi";
import { TabRpcClient } from "@/app/store/wshrpcutil";
import { createBlock } from "@/store/global";
import { makeIconClass } from "@/util/util";
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
import { calculateGridSize, normalizeAppList } from "./widget-helpers";

const AppsFloatingWindow = memo(({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
    const [apps, setApps] = useState<AppInfo[]>([]);
    const [loading, setLoading] = useState(true);

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

        const fetchApps = async () => {
            setLoading(true);
            try {
                const allApps = normalizeAppList(await RpcApi.ListAllAppsCommand(TabRpcClient));
                const localApps = allApps
                    .filter((app) => !app.appid.startsWith("draft/"))
                    .sort((a, b) => {
                        const aName = a.appid.replace(/^local\//, "");
                        const bName = b.appid.replace(/^local\//, "");
                        return aName.localeCompare(bName);
                    });
                setApps(localApps);
            } catch (error) {
                console.error("Failed to fetch apps:", error);
                setApps([]);
            } finally {
                setLoading(false);
            }
        };

        fetchApps();
    }, [isOpen]);

    if (!isOpen) return null;

    const gridSize = calculateGridSize(apps.length);

    return (
        <FloatingPortal>
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="bg-modalbg border border-border rounded-lg shadow-xl p-4 z-50"
            >
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <i className="fa fa-solid fa-spinner fa-spin text-2xl text-muted"></i>
                    </div>
                ) : apps.length === 0 ? (
                    <div className="text-muted text-sm p-4 text-center">No local apps found</div>
                ) : (
                    <div
                        className="grid gap-3"
                        style={{
                            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                            maxWidth: `${gridSize * 80}px`,
                        }}
                    >
                        {apps.map((app) => {
                            const appMeta = app.manifest?.appmeta;
                            const displayName = app.appid.replace(/^local\//, "");
                            const icon = appMeta?.icon || "cube";
                            const iconColor = appMeta?.iconcolor || "white";

                            return (
                                <div
                                    key={app.appid}
                                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-hoverbg cursor-pointer transition-colors"
                                    onClick={() => {
                                        const blockDef: BlockDef = {
                                            meta: {
                                                view: "tsunami",
                                                controller: "tsunami",
                                                "tsunami:appid": app.appid,
                                            },
                                        };
                                        createBlock(blockDef);
                                        onClose();
                                    }}
                                >
                                    <div style={{ color: iconColor }} className="text-3xl mb-1">
                                        <i className={makeIconClass(icon, false)}></i>
                                    </div>
                                    <div className="text-xxs text-center text-secondary break-words w-full px-1">
                                        {displayName}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </FloatingPortal>
    );
});

AppsFloatingWindow.displayName = "AppsFloatingWindow";

export { AppsFloatingWindow };
