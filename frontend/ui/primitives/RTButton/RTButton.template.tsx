// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";
import { forwardRef, memo, useImperativeHandle, useRef } from "react";

import "./RTButton.style.scss";
import { ButtonProps, normalizeButtonClassName } from "./RTButton.logic";

const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(
    (
      {
        children,
        disabled,
        className = "",
        as: Component = "button",
        ...props
      }: ButtonProps,
      ref
    ) => {
      const btnRef = useRef<HTMLButtonElement>(null);
      useImperativeHandle(ref, () => btnRef.current as HTMLButtonElement);

      const finalClassName = normalizeButtonClassName(className);

      return (
        <Component
          ref={btnRef}
          tabIndex={disabled ? -1 : 0}
          className={clsx("wave-button", finalClassName)}
          disabled={disabled}
          {...props}
        >
          {children}
        </Component>
      );
    }
  )
);

Button.displayName = "Button";

export { Button };
