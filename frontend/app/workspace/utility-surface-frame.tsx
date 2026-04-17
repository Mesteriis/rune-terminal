import { makeIconClass } from "@/util/util";
import clsx from "clsx";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

interface UtilitySurfaceFrameProps {
    title: string;
    icon: string;
    children: ReactNode;
    onClose?: () => void;
    headerActions?: ReactNode;
    headerLeading?: ReactNode;
    widthClassName?: string;
    bodyClassName?: string;
    className?: string;
    testID?: string;
    headerTestID?: string;
    headerClassName?: string;
    onHeaderPointerDown?: (event: ReactPointerEvent<HTMLDivElement>) => void;
    headerCursor?: CSSProperties["cursor"];
}

export function UtilitySurfaceFrame({
    title,
    icon,
    children,
    onClose,
    headerActions,
    headerLeading,
    widthClassName = "w-[min(90vw,30rem)] max-w-[30rem]",
    bodyClassName,
    className,
    testID,
    headerTestID,
    headerClassName,
    onHeaderPointerDown,
    headerCursor,
}: UtilitySurfaceFrameProps) {
    const frameStyle: CSSProperties = {
        border: "0.5px solid var(--modal-border-color)",
        background: "var(--modal-bg-color)",
        boxShadow: "0px 8px 32px 0px rgba(0, 0, 0, 0.25)",
    };
    const headerStyle: CSSProperties = {
        borderBottom: "1px solid var(--modal-header-bottom-border-color)",
    };

    return (
        <div
            className={clsx(
                "flex max-h-[min(82vh,46rem)] min-h-[18rem] flex-col overflow-hidden rounded-[8px]",
                widthClassName,
                className,
            )}
            style={frameStyle}
            data-testid={testID}
        >
            <div
                className={clsx("flex min-h-[35px] items-center justify-between gap-2 px-4 py-2", headerClassName)}
                style={{ ...headerStyle, cursor: headerCursor }}
                data-testid={headerTestID}
                onPointerDown={onHeaderPointerDown}
            >
                <div className="flex min-w-0 items-center gap-2">
                    {headerLeading}
                    <i className={clsx(makeIconClass(icon, false), "shrink-0 text-[12px] text-secondary")} />
                    <div className="truncate text-[12px] font-semibold text-white">{title}</div>
                </div>
                <div className="flex items-center gap-1">
                    {headerActions}
                    {onClose ? (
                        <button
                            type="button"
                            className="rounded px-2 py-1.5 text-secondary transition-colors hover:bg-[rgba(255,255,255,0.09)] hover:text-white"
                            aria-label={`Close ${title}`}
                            onClick={onClose}
                        >
                            <i className={makeIconClass("xmark", false)} />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className={clsx("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
        </div>
    );
}
