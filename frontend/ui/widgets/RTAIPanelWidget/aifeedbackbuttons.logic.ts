export interface AIFeedbackButtonsProps {
    messageText: string;
}

export function getAIFeedbackButtonsContainerClassName(): string {
    return "flex items-center gap-0.5 mt-2";
}

export function getAIFeedbackThumbButtonStateClassName(clicked: boolean): string {
    return clicked ? "text-accent" : "text-secondary hover:bg-zinc-700 hover:text-primary";
}

export function getAIFeedbackCopyButtonStateClassName(copied: boolean): string {
    return copied ? "text-success" : "text-secondary hover:bg-zinc-700 hover:text-primary";
}

export function getThumbIconName(clicked: boolean, direction: "up" | "down"): string {
    return `${clicked ? "solid" : "regular"}@thumbs-${direction}`;
}

export function getCopyIconName(copied: boolean): string {
    return copied ? "solid@check" : "regular@copy";
}

export function shouldShowCopyButton(messageText: string): boolean {
    return Boolean(messageText?.trim());
}
