// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { cn } from "@/util/util";
import { formatFileSize, getFileIcon } from "./ai-utils";
import type { DroppedFile, WaveAIModel } from "./waveai-model";

export type AIDroppedFile = DroppedFile;

export type AIDroppedFilesModel = Pick<WaveAIModel, "droppedFiles" | "removeFile">;

export interface AIDroppedFilesProps {
    model: AIDroppedFilesModel;
}

export function getAIDroppedFilesRootClassName(): string {
    return "p-2 border-b border-gray-600";
}

export function getAIDroppedFilesListClassName(): string {
    return "flex gap-2 overflow-x-auto pb-1";
}

export function getAIDroppedFileCardClassName(): string {
    return "relative bg-zinc-700 rounded-lg p-2 min-w-20 flex-shrink-0 group";
}

export function getAIDroppedFileRemoveButtonClassName(): string {
    return "absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer";
}

export function getAIDroppedFilePreviewWrapperClassName(): string {
    return "w-12 h-12 mb-1";
}

export function getAIDroppedFilePreviewImageClassName(): string {
    return "w-full h-full object-cover rounded";
}

export function getAIDroppedFileFallbackPreviewClassName(): string {
    return "w-12 h-12 mb-1 flex items-center justify-center bg-zinc-600 rounded";
}

export function getAIDroppedFileIconClassName(fileName: string, fileType: string): string {
    return cn("fa text-lg text-gray-300", getFileIcon(fileName, fileType));
}

export function getAIDroppedFileNameClassName(): string {
    return "text-[10px] text-gray-200 truncate w-full max-w-16";
}

export function getAIDroppedFileSizeClassName(): string {
    return "text-[9px] text-gray-400";
}

export function getAIDroppedFileAttachmentHintClassName(): string {
    return "text-[9px] text-gray-400 leading-3 mt-0.5";
}

export function getAIDroppedFileAttachmentStatusClassName(file: AIDroppedFile): string | null {
    if (file.attachmentState === "missing") {
        return "text-red-300";
    }
    if (file.consumptionHint === "metadata_only") {
        return "text-amber-300";
    }
    return null;
}

export function getAIDroppedFileAttachmentStatusLabel(file: AIDroppedFile): string | null {
    if (file.attachmentState === "missing") {
        return "missing";
    }
    if (file.consumptionHint === "metadata_only") {
        return "metadata only";
    }
    return null;
}

export function getAIDroppedFileDisplayTitle(file: AIDroppedFile): string {
    return file.localPath || file.name;
}

export function formatAIDroppedFileSize(size: number): string {
    return formatFileSize(size);
}

export function hasAIDroppedFilePreview(file: AIDroppedFile): boolean {
    return Boolean(file.previewUrl);
}

export function shouldShowAIDroppedFileAttachmentHint(file: AIDroppedFile): boolean {
    return Boolean(file.attachmentReference);
}
