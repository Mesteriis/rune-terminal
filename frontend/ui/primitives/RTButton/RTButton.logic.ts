// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: ReactNode;
  as?: keyof React.JSX.IntrinsicElements | React.ComponentType<any>;
}

/**
 * Normalizes className to include category and color defaults
 * @param className Input class string
 * @returns Normalized class string with category and color applied
 */
export function normalizeButtonClassName(className: string = ""): string {
  // Check if the className contains any of the categories: solid, outlined, or ghost
  const containsButtonCategory = /(solid|outline|ghost)/.test(className);
  // If no category is present, default to 'solid'
  const categoryClassName = containsButtonCategory ? className : `solid ${className}`;

  // Check if the className contains any of the color options: green, grey, red, or yellow
  const containsColor = /(green|grey|red|yellow)/.test(categoryClassName);
  // If no color is present, default to 'green'
  return containsColor ? categoryClassName : `green ${categoryClassName}`;
}
