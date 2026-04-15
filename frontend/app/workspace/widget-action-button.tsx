import { Tooltip } from "@/app/element/tooltip";
import { makeIconClass } from "@/util/util";
import { memo } from "react";
import type { CSSProperties, RefObject } from "react";
import type { WidgetDisplayMode } from "./widget-types";

interface WidgetActionButtonProps {
    buttonRef?: RefObject<HTMLDivElement | null>;
    icon: string;
    tooltip: string;
    isOpen: boolean;
    onClick: () => void;
    mode: WidgetDisplayMode;
    label?: string;
    defaultIcon?: string;
    style?: CSSProperties;
}

const WidgetActionButton = memo(
    ({ buttonRef, icon, tooltip, isOpen, onClick, mode, label, defaultIcon, style }: WidgetActionButtonProps) => {
        const iconOptions = defaultIcon ? { defaultIcon } : undefined;

        return (
            <div
                ref={buttonRef}
                className={
                    mode === "supercompact"
                        ? "flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-sm overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                        : "flex flex-col justify-center items-center w-full py-1.5 pr-0.5 text-secondary text-lg overflow-hidden rounded-sm hover:bg-hoverbg hover:text-white cursor-pointer"
                }
                style={style}
                onClick={onClick}
            >
                <Tooltip content={tooltip} placement="left" disable={isOpen}>
                    {mode === "supercompact" ? (
                        <div>
                            <i className={makeIconClass(icon, true, iconOptions)}></i>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <div>
                                <i className={makeIconClass(icon, true, iconOptions)}></i>
                            </div>
                            {mode === "normal" && label ? (
                                <div className="text-xxs mt-0.5 w-full px-0.5 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                    {label}
                                </div>
                            ) : null}
                        </div>
                    )}
                </Tooltip>
            </div>
        );
    }
);

WidgetActionButton.displayName = "WidgetActionButton";

export { WidgetActionButton };
