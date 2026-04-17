import type { FloatingWindowProps } from "@/app/workspace/widget-types";
import { SettingsUtilitySurface } from "@/app/workspace/settings-utility-surface";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import ReactDOM from "react-dom";

interface SettingsFloatingWindowProps extends FloatingWindowProps {
    onOpenTools?: () => void;
}

interface OverlayPosition {
    x: number;
    y: number;
}

interface OverlaySize {
    width: number;
    height: number;
}

const OVERLAY_MARGIN = 18;
const OVERLAY_OFFSET = 16;

function clampPosition(position: OverlayPosition, size: OverlaySize): OverlayPosition {
    const maxX = Math.max(OVERLAY_MARGIN, window.innerWidth - size.width - OVERLAY_MARGIN);
    const maxY = Math.max(OVERLAY_MARGIN, window.innerHeight - size.height - OVERLAY_MARGIN);
    return {
        x: Math.min(Math.max(position.x, OVERLAY_MARGIN), maxX),
        y: Math.min(Math.max(position.y, OVERLAY_MARGIN), maxY),
    };
}

function measureOverlaySize(element: HTMLElement | null): OverlaySize {
    if (element == null) {
        return { width: 544, height: 520 };
    }
    const rect = element.getBoundingClientRect();
    return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
    };
}

function computeInitialPosition(referenceElement: HTMLElement | null, size: OverlaySize): OverlayPosition {
    if (referenceElement == null) {
        return clampPosition(
            {
                x: window.innerWidth - size.width - 32,
                y: 72,
            },
            size,
        );
    }
    const rect = referenceElement.getBoundingClientRect();
    let x = rect.left - size.width - OVERLAY_OFFSET;
    if (x < OVERLAY_MARGIN) {
        x = rect.right + OVERLAY_OFFSET;
    }
    return clampPosition(
        {
            x,
            y: rect.top - 10,
        },
        size,
    );
}

export const SettingsFloatingWindow = memo(
    ({ isOpen, onClose, referenceElement, onOpenTools }: SettingsFloatingWindowProps) => {
        const frameRef = useRef<HTMLDivElement>(null);
        const dragStateRef = useRef<{
            startX: number;
            startY: number;
            origin: OverlayPosition;
        } | null>(null);
        const [position, setPosition] = useState<OverlayPosition | null>(null);
        const [frameSize, setFrameSize] = useState<OverlaySize>({ width: 544, height: 520 });
        const [dragging, setDragging] = useState(false);

        const syncFrameBounds = useCallback(() => {
            const nextSize = measureOverlaySize(frameRef.current);
            setFrameSize((current) =>
                current.width === nextSize.width && current.height === nextSize.height ? current : nextSize,
            );
            setPosition((current) => {
                const anchored = current ?? computeInitialPosition(referenceElement ?? null, nextSize);
                return clampPosition(anchored, nextSize);
            });
        }, [referenceElement]);

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

        useLayoutEffect(() => {
            if (!isOpen) {
                return;
            }
            syncFrameBounds();
        }, [isOpen, syncFrameBounds]);

        useEffect(() => {
            if (!isOpen || frameRef.current == null) {
                return;
            }
            const observer = new ResizeObserver(() => {
                syncFrameBounds();
            });
            observer.observe(frameRef.current);
            window.addEventListener("resize", syncFrameBounds);
            return () => {
                observer.disconnect();
                window.removeEventListener("resize", syncFrameBounds);
            };
        }, [isOpen, syncFrameBounds]);

        useEffect(() => {
            if (!isOpen) {
                setPosition(null);
                setDragging(false);
                dragStateRef.current = null;
            }
        }, [isOpen]);

        const stopDragging = useCallback(() => {
            dragStateRef.current = null;
            setDragging(false);
        }, []);

        useEffect(() => {
            if (!dragging) {
                return;
            }

            const handlePointerMove = (event: PointerEvent) => {
                const dragState = dragStateRef.current;
                if (dragState == null) {
                    return;
                }
                const deltaX = event.clientX - dragState.startX;
                const deltaY = event.clientY - dragState.startY;
                setPosition(
                    clampPosition(
                        {
                            x: dragState.origin.x + deltaX,
                            y: dragState.origin.y + deltaY,
                        },
                        frameSize,
                    ),
                );
            };

            const handlePointerUp = () => {
                stopDragging();
            };

            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerup", handlePointerUp);
            return () => {
                window.removeEventListener("pointermove", handlePointerMove);
                window.removeEventListener("pointerup", handlePointerUp);
            };
        }, [dragging, frameSize, stopDragging]);

        const handleHeaderPointerDown = useCallback(
            (event: ReactPointerEvent<HTMLDivElement>) => {
                const target = event.target as HTMLElement | null;
                if (target?.closest("button, a, input, select, textarea")) {
                    return;
                }
                const origin = position ?? computeInitialPosition(referenceElement ?? null, frameSize);
                dragStateRef.current = {
                    startX: event.clientX,
                    startY: event.clientY,
                    origin,
                };
                setPosition(origin);
                setDragging(true);
                event.preventDefault();
            },
            [frameSize, position, referenceElement],
        );

        if (!isOpen) {
            return null;
        }

        const mountNode = document.body;
        const overlayPosition = position ?? computeInitialPosition(referenceElement ?? null, frameSize);

        return ReactDOM.createPortal(
            <div className="fixed inset-0" style={{ zIndex: "var(--zindex-shell-overlay)" }}>
                <button
                    type="button"
                    className="absolute inset-0"
                    style={{ backgroundColor: "rgba(10, 12, 10, 0.16)" }}
                    aria-label="Close settings overlay"
                    onClick={onClose}
                />
                <div
                    ref={frameRef}
                    className="absolute"
                    style={{
                        left: `${overlayPosition.x}px`,
                        top: `${overlayPosition.y}px`,
                    }}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="max-h-[min(84vh,50rem)] overflow-hidden rounded-lg">
                        <SettingsUtilitySurface
                            onClose={onClose}
                            onOpenTools={onOpenTools}
                            onHeaderPointerDown={handleHeaderPointerDown}
                            dragging={dragging}
                        />
                    </div>
                </div>
            </div>,
            mountNode,
        );
    }
);

SettingsFloatingWindow.displayName = "SettingsFloatingWindow";
