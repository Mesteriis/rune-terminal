// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { ReactNode } from "react";

interface ModalProps {
    id?: string;
    children: ReactNode;
    onClickOut: () => void;
}

interface ModalContentProps {
    children: ReactNode;
}

interface ModalHeaderProps {
    title: ReactNode;
    description?: string;
}

interface ModalFooterProps {
    children: ReactNode;
}

interface WaveModalProps {
    title: string;
    description?: string;
    id?: string;
    onSubmit: () => void;
    onCancel: () => void;
    buttonLabel?: string;
    children: ReactNode;
}

export type { ModalContentProps, ModalFooterProps, ModalHeaderProps, ModalProps, WaveModalProps };
