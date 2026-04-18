// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

export interface TelemetryRequiredMessageProps {
    className?: string;
}

export const TELEMETRY_REQUIRED_WAVEAI_MODES_DOC_URL =
    "https://github.com/sanshao85/tideterm/blob/main/docs/docs/waveai-modes.mdx";

export const TELEMETRY_REQUIRED_PRIVACY_DOC_URL = "https://github.com/sanshao85/tideterm/blob/main/PRIVACY.md";

export function getTelemetryRequiredRootClassName(): string {
    return "flex flex-col h-full";
}

export function getTelemetryRequiredInfoCardClassName(): string {
    return "bg-blue-900/20 border border-blue-500 rounded-lg p-4";
}

export function getTelemetryRequiredTitleClassName(): string {
    return "text-blue-400 font-medium mb-1";
}

export function getTelemetryRequiredBodyClassName(): string {
    return "text-secondary text-sm mb-3";
}

export function getTelemetryRequiredEnableButtonClassName(): string {
    return "bg-accent/80 hover:bg-accent disabled:bg-accent/50 text-background px-4 py-2 rounded-lg font-medium cursor-pointer disabled:cursor-not-allowed";
}

export function getTelemetryRequiredEnableButtonLabel(isEnabling: boolean): string {
    return isEnabling ? "Enabling..." : "Enable Telemetry and Continue";
}

