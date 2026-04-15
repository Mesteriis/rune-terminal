import { useT } from "@/app/i18n/i18n";
import type { FloatingWindowProps } from "@/app/workspace/widget-types";
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
import { memo } from "react";

const SettingsFloatingWindow = memo(({ isOpen, onClose, referenceElement }: FloatingWindowProps) => {
    const t = useT();
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

    if (!isOpen) return null;

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
                className="bg-modalbg border border-border rounded-lg shadow-xl p-2 z-50"
            >
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
