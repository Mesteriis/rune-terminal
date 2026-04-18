import { atoms } from "@/app/store/global";
import * as jotai from "jotai";
import { memo, useEffect, useState } from "react";
import {
    RATE_LIMIT_STRIP_ENABLED,
    formatTimeRemaining,
    getAIRateLimitBasicFallbackClassName,
    getAIRateLimitDisplayVariant,
    getAIRateLimitLimitReachedClassName,
    getAIRateLimitLimitReachedTimeClassName,
    getAIRateLimitPremiumTimeClassName,
    getAIRateLimitPremiumWarningClassName,
    getGetMoreButtonClassNames,
    shouldShowAIRateLimitStrip,
    type GetMoreButtonVariant,
} from "./airatelimitstrip.logic";
import "./airatelimitstrip.style.scss";

interface GetMoreButtonProps {
    variant: GetMoreButtonVariant;
    showClose?: boolean;
}

const GetMoreButton = memo(({ variant, showClose = true }: GetMoreButtonProps) => {
    const { bgColor, hoverBg, borderColor, textColor, iconColor, iconHoverBg } = getGetMoreButtonClassNames(variant, showClose);

    if (!RATE_LIMIT_STRIP_ENABLED) {
        // disable now until we have modal
        return null;
    }

    return (
        <div className="pl-2 pb-1.5">
            <button
                className={`flex items-center gap-1.5 ${showClose ? "pl-1" : "pl-2"} pr-2 py-1 ${bgColor} ${iconHoverBg} ${hoverBg} rounded-b border border-t-0 ${borderColor} text-[11px] ${textColor} cursor-pointer transition-colors`}
            >
                {showClose ? (
                    <i className={`close fa fa-xmark ${iconColor}/60 hover:${iconColor} transition-colors`}></i>
                ) : null}
                <span>Get More</span>
                <i className={`fa fa-arrow-right ${iconColor}`}></i>
            </button>
        </div>
    );
});

GetMoreButton.displayName = "GetMoreButton";

export interface AIRateLimitStripTemplateProps {
    rateLimitInfo: RateLimitInfo | null | undefined;
}

export const AIRateLimitStripTemplate = memo(({ rateLimitInfo }: AIRateLimitStripTemplateProps) => {
    const [, forceUpdate] = useState({});
    const shouldShow = shouldShowAIRateLimitStrip(rateLimitInfo);

    useEffect(() => {
        if (!shouldShow) {
            return;
        }

        const interval = setInterval(() => {
            forceUpdate({});
        }, 60000);

        return () => clearInterval(interval);
    }, [shouldShow]);

    if (rateLimitInfo == null || rateLimitInfo.unknown || !shouldShow) {
        return null;
    }

    const { reqlimit, preq, preqlimit, resetepoch } = rateLimitInfo;
    const timeRemaining = formatTimeRemaining(resetepoch);
    const totalLimit = preqlimit + reqlimit;
    const displayVariant = getAIRateLimitDisplayVariant(rateLimitInfo);

    if (displayVariant === "premium-nearly-exhausted") {
        return (
            <div>
                <div className={getAIRateLimitPremiumWarningClassName()}>
                    <i className="fa fa-sparkles text-yellow-400"></i>
                    <span>
                        {preqlimit - preq}/{preqlimit} Premium Used
                    </span>
                    <div className="flex-1"></div>
                    <span className={getAIRateLimitPremiumTimeClassName()}>Resets in {timeRemaining}</span>
                </div>
                <GetMoreButton variant="yellow" />
            </div>
        );
    }

    if (displayVariant === "premium-exhausted-basic-active") {
        return (
            <div>
                <div className={getAIRateLimitBasicFallbackClassName()}>
                    <i className="fa fa-check text-yellow-400"></i>
                    <span>
                        {preqlimit}/{preqlimit} Premium
                    </span>
                    <span className="text-yellow-400">•</span>
                    <span className="font-medium">Now on Basic</span>
                    <div className="flex-1"></div>
                    <span className={getAIRateLimitPremiumTimeClassName()}>Resets in {timeRemaining}</span>
                </div>
                <GetMoreButton variant="yellow" />
            </div>
        );
    }

    if (displayVariant === "hard-limit-reached") {
        return (
            <div>
                <div className={getAIRateLimitLimitReachedClassName()}>
                    <i className="fa fa-check text-red-400"></i>
                    <span>
                        {totalLimit}/{totalLimit} Reqs
                    </span>
                    <span className="text-red-400">•</span>
                    <span className="font-medium">Limit Reached</span>
                    <div className="flex-1"></div>
                    <span className={getAIRateLimitLimitReachedTimeClassName()}>Resets in {timeRemaining}</span>
                </div>
                <GetMoreButton variant="red" showClose={false} />
            </div>
        );
    }

    return null;
});

AIRateLimitStripTemplate.displayName = "AIRateLimitStripTemplate";

const AIRateLimitStripComponent = memo(() => {
    const rateLimitInfo = jotai.useAtomValue(atoms.waveAIRateLimitInfoAtom);
    return <AIRateLimitStripTemplate rateLimitInfo={rateLimitInfo} />;
});

AIRateLimitStripComponent.displayName = "AIRateLimitStrip";

export { AIRateLimitStripComponent as AIRateLimitStrip };
