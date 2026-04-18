export const RATE_LIMIT_STRIP_ENABLED = false;

export type GetMoreButtonVariant = "yellow" | "red";

export type AIRateLimitDisplayVariant =
    | "premium-nearly-exhausted"
    | "premium-exhausted-basic-active"
    | "hard-limit-reached"
    | "hidden";

export interface GetMoreButtonClassNames {
    bgColor: string;
    hoverBg: string;
    borderColor: string;
    textColor: string;
    iconColor: string;
    iconHoverBg: string;
}

export function getGetMoreButtonClassNames(
    variant: GetMoreButtonVariant,
    showClose: boolean
): GetMoreButtonClassNames {
    const isYellow = variant === "yellow";
    const bgColor = isYellow ? "bg-yellow-900/30" : "bg-red-900/30";
    const hoverBg = isYellow ? "hover:bg-yellow-700/60" : "hover:bg-red-700/60";
    const borderColor = isYellow ? "border-yellow-700/50" : "border-red-700/50";
    const textColor = isYellow ? "text-yellow-200" : "text-red-200";
    const iconColor = isYellow ? "text-yellow-400" : "text-red-400";
    const iconHoverBg =
        showClose && isYellow
            ? "hover:has-[.close:hover]:bg-yellow-900/30"
            : showClose
              ? "hover:has-[.close:hover]:bg-red-900/30"
              : "";
    return {
        bgColor,
        hoverBg,
        borderColor,
        textColor,
        iconColor,
        iconHoverBg,
    };
}

export function shouldShowAIRateLimitStrip(rateLimitInfo: RateLimitInfo | null | undefined): boolean {
    return rateLimitInfo != null && !rateLimitInfo.unknown && (rateLimitInfo.preq <= 5 || rateLimitInfo.req === 0);
}

export function getAIRateLimitDisplayVariant(
    rateLimitInfo: RateLimitInfo | null | undefined
): AIRateLimitDisplayVariant {
    if (rateLimitInfo == null || rateLimitInfo.unknown) {
        return "hidden";
    }
    const { req, preq } = rateLimitInfo;
    if (preq > 0 && preq <= 5) {
        return "premium-nearly-exhausted";
    }
    if (preq === 0 && req > 0) {
        return "premium-exhausted-basic-active";
    }
    if (req === 0 && preq === 0) {
        return "hard-limit-reached";
    }
    return "hidden";
}

export function formatTimeRemaining(expirationEpoch: number): string {
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = expirationEpoch - now;

    if (secondsRemaining <= 0) {
        return "soon";
    }

    const hours = Math.floor(secondsRemaining / 3600);
    const minutes = Math.floor((secondsRemaining % 3600) / 60);

    if (hours > 0) {
        return `${hours}h`;
    }
    return `${minutes}m`;
}

export function getAIRateLimitPremiumWarningClassName(): string {
    return "bg-yellow-900/30 border-b border-yellow-700/50 px-2 py-1.5 flex items-center gap-1 text-[11px] text-yellow-200";
}

export function getAIRateLimitBasicFallbackClassName(): string {
    return "bg-yellow-900/30 border-b border-yellow-700/50 px-2 pr-1 py-1.5 flex items-center gap-1 text-[11px] text-yellow-200";
}

export function getAIRateLimitLimitReachedClassName(): string {
    return "bg-red-900/30 border-b border-red-700/50 px-2 py-1.5 flex items-center gap-2 text-[11px] text-red-200";
}

export function getAIRateLimitPremiumTimeClassName(): string {
    return "text-yellow-300/80";
}

export function getAIRateLimitLimitReachedTimeClassName(): string {
    return "text-red-300/80";
}
