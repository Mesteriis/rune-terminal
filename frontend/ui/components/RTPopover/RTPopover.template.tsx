// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Button } from "@/ui/primitives/RTButton";
import {
    autoUpdate,
    FloatingPortal,
    offset as offsetMiddleware,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
} from "@floating-ui/react";
import clsx from "clsx";
import {
    Children,
    cloneElement,
    forwardRef,
    isValidElement,
    JSXElementConstructor,
    memo,
    ReactElement,
    useState,
} from "react";

import "./RTPopover.style.scss";
import type { PopoverButtonProps, PopoverContentProps, PopoverProps } from "./RTPopover.logic";

const isPopoverButton = (
    element: ReactElement
): element is ReactElement<PopoverButtonProps, JSXElementConstructor<PopoverButtonProps>> => {
    return element.type === PopoverButton;
};

const isPopoverContent = (
    element: ReactElement
): element is ReactElement<PopoverContentProps, JSXElementConstructor<PopoverContentProps>> => {
    return element.type === PopoverContent;
};

const Popover = memo(
    forwardRef<HTMLDivElement, PopoverProps>(
        ({ children, className, placement = "bottom-start", offset = 3, onDismiss, middleware }, ref) => {
            const [isOpen, setIsOpen] = useState(false);

            const handleOpenChange = (open: boolean) => {
                setIsOpen(open);
                if (!open && onDismiss) {
                    onDismiss();
                }
            };

            if (offset === undefined) {
                offset = 3;
            }

            middleware ??= [];
            middleware.push(offsetMiddleware(offset));

            const { refs, floatingStyles, context } = useFloating({
                placement,
                open: isOpen,
                onOpenChange: handleOpenChange,
                middleware: middleware,
                whileElementsMounted: autoUpdate,
            });

            const click = useClick(context);
            const dismiss = useDismiss(context);
            const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss]);

            const renderChildren = Children.map(children, (child) => {
                if (isValidElement(child)) {
                    if (isPopoverButton(child)) {
                        return cloneElement(child as any, {
                            isActive: isOpen,
                            ref: refs.setReference,
                            getReferenceProps,
                        });
                    }

                    if (isPopoverContent(child)) {
                        return isOpen
                            ? cloneElement(child as any, {
                                  ref: refs.setFloating,
                                  style: floatingStyles,
                                  getFloatingProps,
                              })
                            : null;
                    }
                }
                return child;
            });

            return (
                <div ref={ref} className={clsx("popover", className)}>
                    {renderChildren}
                </div>
            );
        }
    )
);

Popover.displayName = "Popover";

const PopoverButton = forwardRef<HTMLButtonElement | HTMLDivElement, PopoverButtonProps>(
    (
        {
            isActive,
            children,
            onClick: userOnClick,
            getReferenceProps,
            className,
            as: Component = "button",
            ...props
        },
        ref
    ) => {
        const referenceProps = getReferenceProps?.() || {};
        const popoverOnClick = referenceProps.onClick;

        const { onClick: refOnClick, ...restReferenceProps } = referenceProps;

        const combinedOnClick = (event: React.MouseEvent) => {
            if (userOnClick) {
                userOnClick(event as any);
            }
            if (popoverOnClick) {
                popoverOnClick(event);
            }
        };

        return (
            <Button
                ref={ref}
                className={clsx("popover-button", className, { "is-active": isActive })}
                {...props}
                {...restReferenceProps}
                onClick={combinedOnClick}
            >
                {children}
            </Button>
        );
    }
);

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
    ({ children, className, getFloatingProps, style, ...props }, ref) => {
        return (
            <FloatingPortal>
                <div
                    ref={ref}
                    className={clsx("popover-content", className)}
                    style={style}
                    {...getFloatingProps?.()}
                    {...props}
                >
                    {children}
                </div>
            </FloatingPortal>
        );
    }
);

PopoverButton.displayName = "PopoverButton";
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverButton, PopoverContent };
