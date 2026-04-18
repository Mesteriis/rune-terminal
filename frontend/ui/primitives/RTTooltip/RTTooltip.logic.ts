// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { CSSProperties, ReactNode } from "react";

export interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
  forceOpen?: boolean;
  disable?: boolean;
  divClassName?: string;
  divStyle?: CSSProperties;
  divOnClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}
