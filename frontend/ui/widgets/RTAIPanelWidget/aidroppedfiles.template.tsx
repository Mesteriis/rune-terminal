// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { useAtomValue } from "jotai";
import { memo } from "react";
import {
    formatAIDroppedFileSize,
    getAIDroppedFileAttachmentHintClassName,
    getAIDroppedFileAttachmentStatusClassName,
    getAIDroppedFileAttachmentStatusLabel,
    getAIDroppedFileCardClassName,
    getAIDroppedFileDisplayTitle,
    getAIDroppedFileFallbackPreviewClassName,
    getAIDroppedFileIconClassName,
    getAIDroppedFileNameClassName,
    getAIDroppedFilePreviewImageClassName,
    getAIDroppedFilePreviewWrapperClassName,
    getAIDroppedFileRemoveButtonClassName,
    getAIDroppedFileSizeClassName,
    getAIDroppedFilesListClassName,
    getAIDroppedFilesRootClassName,
    hasAIDroppedFilePreview,
    shouldShowAIDroppedFileAttachmentHint,
    type AIDroppedFilesProps,
} from "./aidroppedfiles.logic";
import "./aidroppedfiles.style.scss";

const AIDroppedFiles = memo(({ model }: AIDroppedFilesProps) => {
    const droppedFiles = useAtomValue(model.droppedFiles);

    if (droppedFiles.length === 0) {
        return null;
    }

    return (
        <div className={getAIDroppedFilesRootClassName()}>
            <div className={getAIDroppedFilesListClassName()}>
                {droppedFiles.map((file) => {
                    const attachmentStatusClassName = getAIDroppedFileAttachmentStatusClassName(file);
                    const attachmentStatusLabel = getAIDroppedFileAttachmentStatusLabel(file);

                    return (
                        <div key={file.id} className={getAIDroppedFileCardClassName()}>
                            <button onClick={() => model.removeFile(file.id)} className={getAIDroppedFileRemoveButtonClassName()}>
                                <i className="fa fa-times text-xs"></i>
                            </button>

                            <div className="flex flex-col items-center text-center">
                                {hasAIDroppedFilePreview(file) ? (
                                    <div className={getAIDroppedFilePreviewWrapperClassName()}>
                                        <img
                                            src={file.previewUrl}
                                            alt={file.name}
                                            className={getAIDroppedFilePreviewImageClassName()}
                                        />
                                    </div>
                                ) : (
                                    <div className={getAIDroppedFileFallbackPreviewClassName()}>
                                        <i className={getAIDroppedFileIconClassName(file.name, file.type)}></i>
                                    </div>
                                )}

                                <div className={getAIDroppedFileNameClassName()} title={getAIDroppedFileDisplayTitle(file)}>
                                    {file.name}
                                </div>
                                <div className={getAIDroppedFileSizeClassName()}>{formatAIDroppedFileSize(file.size)}</div>
                                {shouldShowAIDroppedFileAttachmentHint(file) && (
                                    <div className={getAIDroppedFileAttachmentHintClassName()}>
                                        <div>local ref</div>
                                        {attachmentStatusLabel != null && (
                                            <div className={attachmentStatusClassName ?? undefined}>{attachmentStatusLabel}</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

AIDroppedFiles.displayName = "AIDroppedFiles";

export { AIDroppedFiles };
