// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { type Middleware, type OffsetOptions, type Placement } from "@floating-ui/react";
import { ReactNode } from "react";

interface PopoverProps {
    children: ReactNode;
    className?: string;
    placement?: Placement;
    offset?: OffsetOptions;
    onDismiss?: () => void;
    middleware?: Middleware[];
}

interface PopoverButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isActive?: boolean;
    children: React.ReactNode;
    getReferenceProps?: () => any;
    as?: keyof React.JSX.IntrinsicElements | React.ComponentType<any>;
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    getFloatingProps?: () => any;
}

export type { PopoverButtonProps, PopoverContentProps, PopoverProps };
