import { makeIconClass } from "@/util/util";
import clsx from "clsx";
import type { ReactNode } from "react";

interface UtilitySurfaceFrameProps {
    title: string;
    icon: string;
    children: ReactNode;
    onClose?: () => void;
    headerActions?: ReactNode;
    widthClassName?: string;
    bodyClassName?: string;
    className?: string;
    testID?: string;
}

export function UtilitySurfaceFrame({
    title,
    icon,
    children,
    onClose,
    headerActions,
    widthClassName = "w-[min(90vw,30rem)] max-w-[30rem]",
    bodyClassName,
    className,
    testID,
}: UtilitySurfaceFrameProps) {
    return (
        <div
            className={clsx(
                "flex max-h-[min(82vh,46rem)] min-h-[18rem] flex-col overflow-hidden rounded-lg border border-border bg-modalbg shadow-xl backdrop-blur-sm",
                widthClassName,
                className,
            )}
            data-testid={testID}
        >
            <div className="flex min-h-[30px] items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <i className={clsx(makeIconClass(icon, false), "shrink-0 text-[12px] text-secondary")} />
                    <div className="truncate text-[12px] font-semibold text-white">{title}</div>
                </div>
                <div className="flex items-center gap-1">
                    {headerActions}
                    {onClose ? (
                        <button
                            type="button"
                            className="rounded p-1 text-secondary transition-colors hover:bg-hoverbg hover:text-white"
                            aria-label={`Close ${title}`}
                            onClick={onClose}
                        >
                            <i className="fa fa-xmark" />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className={clsx("min-h-0 flex-1 overflow-hidden", bodyClassName)}>{children}</div>
        </div>
    );
}
