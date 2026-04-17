import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { SettingsUtilitySurface } from "@/app/workspace/settings-utility-surface";
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

interface SettingsFloatingWindowProps extends FloatingWindowProps {
    onOpenTools?: () => void;
}

export const SettingsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement, onOpenTools }: SettingsFloatingWindowProps) => {
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

        if (!isOpen) {
            return null;
        }

        return (
            <FloatingPortal>
                <div ref={refs.setFloating} style={floatingStyles} {...getFloatingProps()} className="z-50">
                    <SettingsUtilitySurface onClose={onClose} onOpenTools={onOpenTools} />
                </div>
            </FloatingPortal>
        );
    }
);

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";
