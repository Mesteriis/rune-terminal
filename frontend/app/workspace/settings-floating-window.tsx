import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { SettingsUtilitySurface } from "@/app/workspace/settings-utility-surface";
import { memo, useEffect } from "react";
import ReactDOM from "react-dom";

interface SettingsFloatingWindowProps extends FloatingWindowProps {
    onOpenTools?: () => void;
}

export const SettingsFloatingWindow = memo(
    ({ isOpen, onClose, onOpenTools }: SettingsFloatingWindowProps) => {
        useEffect(() => {
            if (!isOpen) {
                return;
            }
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Escape") {
                    onClose();
                }
            };
            window.addEventListener("keydown", handleKeyDown);
            return () => window.removeEventListener("keydown", handleKeyDown);
        }, [isOpen, onClose]);

        if (!isOpen) {
            return null;
        }

        const mountNode = document.getElementById("main") ?? document.body;

        return ReactDOM.createPortal(
            <div className="fixed inset-0 z-[600]">
                <button
                    type="button"
                    className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                    aria-label="Close settings overlay"
                    onClick={onClose}
                />
                <div className="relative flex h-full w-full items-start justify-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
                    <div className="relative pt-8 sm:pt-10" onClick={(event) => event.stopPropagation()}>
                        <div className="max-h-[min(88vh,50rem)] overflow-hidden rounded-lg">
                    <SettingsUtilitySurface onClose={onClose} onOpenTools={onOpenTools} />
                </div>
                    </div>
                </div>
            </div>,
            mountNode,
        );
    }
);

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";
