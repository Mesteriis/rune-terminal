// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { WaveAIModel } from "./waveai-model";
import {
    getBYOKAnnouncementBodyClassName,
    getBYOKAnnouncementContainerClassName,
    getBYOKAnnouncementTitleClassName,
    getBYOKConfigureButtonClassName,
    getBYOKDocsLinkClassName,
    handleBYOKOpenConfig,
    handleBYOKViewDocs,
    type BYOKAnnouncementProps,
} from "./byokannouncement.logic";
import "./byokannouncement.style.scss";

const BYOKAnnouncement = (_props: BYOKAnnouncementProps) => {
    const model = WaveAIModel.getInstance();

    const onOpenConfig = () => {
        void handleBYOKOpenConfig(() => model.openWaveAIConfig());
    };

    const onViewDocs = () => {
        handleBYOKViewDocs();
    };

    return (
        <div className={getBYOKAnnouncementContainerClassName()}>
            <div className="flex items-start gap-3">
                <i className="fa fa-key text-blue-400 text-lg mt-0.5"></i>
                <div className="text-left flex-1">
                    <div className={getBYOKAnnouncementTitleClassName()}>New: BYOK & Local AI Support</div>
                    <div className={getBYOKAnnouncementBodyClassName()}>
                        TideTerm supports bring-your-own-key (BYOK) with OpenAI, Google Gemini, Azure, and OpenRouter,
                        plus local models via Ollama, LM Studio, and other OpenAI-compatible providers.
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onOpenConfig} className={getBYOKConfigureButtonClassName()}>
                            Configure AI Modes
                        </button>
                        <a
                            href="https://github.com/sanshao85/tideterm/blob/main/docs/docs/waveai-modes.mdx"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onViewDocs}
                            className={getBYOKDocsLinkClassName()}
                        >
                            View Docs <i className="fa fa-external-link text-xs"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

BYOKAnnouncement.displayName = "BYOKAnnouncement";

export { BYOKAnnouncement };

