// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import React, { ReactNode } from "react";

export interface InputGroupProps {
  children: ReactNode;
  className?: string;
}

export interface InputLeftElementProps {
  children: ReactNode;
  className?: string;
}

export interface InputRightElementProps {
  children: ReactNode;
  className?: string;
}

export interface InputProps {
  value?: string;
  className?: string;
  onChange?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<any>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  autoSelect?: boolean;
  disabled?: boolean;
  isNumber?: boolean;
  inputRef?: React.RefObject<any>;
  manageFocus?: (isFocused: boolean) => void;
}
