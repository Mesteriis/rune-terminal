import { cn, makeIconClass } from "@/util/util";
import { memo, useState } from "react";
import { WaveAIModel } from "./waveai-model";
import {
    type AIFeedbackButtonsProps,
    getAIFeedbackButtonsContainerClassName,
    getAIFeedbackCopyButtonStateClassName,
    getAIFeedbackThumbButtonStateClassName,
    getCopyIconName,
    getThumbIconName,
    shouldShowCopyButton,
} from "./aifeedbackbuttons.logic";
import "./aifeedbackbuttons.style.scss";

export const AIFeedbackButtons = memo(({ messageText }: AIFeedbackButtonsProps) => {
    const [thumbsUpClicked, setThumbsUpClicked] = useState(false);
    const [thumbsDownClicked, setThumbsDownClicked] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleThumbsUp = () => {
        setThumbsUpClicked(!thumbsUpClicked);
        if (thumbsDownClicked) {
            setThumbsDownClicked(false);
        }
        if (!thumbsUpClicked) {
            WaveAIModel.getInstance().handleAIFeedback("good");
        }
    };

    const handleThumbsDown = () => {
        setThumbsDownClicked(!thumbsDownClicked);
        if (thumbsUpClicked) {
            setThumbsUpClicked(false);
        }
        if (!thumbsDownClicked) {
            WaveAIModel.getInstance().handleAIFeedback("bad");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(messageText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={getAIFeedbackButtonsContainerClassName()}>
            <button
                onClick={handleThumbsUp}
                className={cn("p-1.5 rounded cursor-pointer transition-colors", getAIFeedbackThumbButtonStateClassName(thumbsUpClicked))}
                title="Good Response"
            >
                <i className={makeIconClass(getThumbIconName(thumbsUpClicked, "up"), false)} />
            </button>
            <button
                onClick={handleThumbsDown}
                className={cn(
                    "p-1.5 rounded cursor-pointer transition-colors",
                    getAIFeedbackThumbButtonStateClassName(thumbsDownClicked)
                )}
                title="Bad Response"
            >
                <i className={makeIconClass(getThumbIconName(thumbsDownClicked, "down"), false)} />
            </button>
            {shouldShowCopyButton(messageText) ? (
                <button
                    onClick={handleCopy}
                    className={cn("p-1.5 rounded cursor-pointer transition-colors", getAIFeedbackCopyButtonStateClassName(copied))}
                    title="Copy Message"
                >
                    <i className={makeIconClass(getCopyIconName(copied), false)} />
                </button>
            ) : null}
        </div>
    );
});

AIFeedbackButtons.displayName = "AIFeedbackButtons";
