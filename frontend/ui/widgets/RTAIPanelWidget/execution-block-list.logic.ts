import type { ExecutionBlock } from "@/compat/execution";

export interface ExecutionBlockListProps {
    blocks: ExecutionBlock[];
    busyBlockID?: string;
    onExplain: (block: ExecutionBlock) => void;
    onRerun: (block: ExecutionBlock) => void;
    onCopyCommand: (block: ExecutionBlock) => void;
}

export function formatExecutionBlockTime(value: string): string {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return value;
    }
    return new Date(timestamp).toLocaleTimeString();
}

export function summarizeExecutionBlockExplain(block: ExecutionBlock): string {
    const summary = block.explain.summary?.trim();
    if (summary) {
        return summary;
    }
    const error = block.explain.error?.trim();
    if (error) {
        return `Explain failed: ${error}`;
    }
    return "Explain data not available.";
}

export function getExecutionBlockSectionClassName(): string {
    return "border-t border-b border-border/60 bg-black/20 px-3 py-2";
}

export function getExecutionBlockHeaderClassName(): string {
    return "flex items-center justify-between mb-2";
}

export function getExecutionBlockTitleClassName(): string {
    return "text-[11px] uppercase tracking-wide text-secondary";
}

export function getExecutionBlockCountClassName(): string {
    return "text-[10px] text-muted";
}

export function getExecutionBlockItemsClassName(): string {
    return "space-y-2 max-h-48 overflow-y-auto pr-1";
}

export function getExecutionBlockItemClassName(): string {
    return "rounded border border-border/70 bg-zinc-950/60 px-2 py-1.5";
}

export function getExecutionBlockItemHeaderClassName(): string {
    return "flex items-center justify-between gap-2";
}

export function getExecutionBlockCommandClassName(): string {
    return "text-[11px] text-primary break-all";
}

export function getExecutionBlockStateClassName(state: ExecutionBlock["result"]["state"]): string {
    const stateClassName = state === "executed" ? "text-emerald-300" : "text-amber-300";
    return `text-[10px] uppercase ${stateClassName}`;
}

export function getExecutionBlockMetaClassName(): string {
    return "mt-1 text-[10px] text-muted";
}

export function getExecutionBlockOutputClassName(): string {
    return "mt-1 whitespace-pre-wrap text-[10px] leading-4 text-zinc-300";
}

export function getExecutionBlockExplainClassName(): string {
    return "mt-1 text-[10px] text-zinc-300";
}

export function getExecutionBlockActionsClassName(): string {
    return "mt-2 flex flex-wrap items-center gap-1.5 text-[10px]";
}

export function getExecutionBlockPendingActionButtonClassName(): string {
    return "px-1.5 py-0.5 rounded border border-border/70 text-secondary hover:text-white disabled:opacity-50";
}

export function getExecutionBlockActionButtonClassName(): string {
    return "px-1.5 py-0.5 rounded border border-border/70 text-secondary hover:text-white";
}

export function getExecutionBlockBusyClassName(): string {
    return "text-muted";
}

export function getExecutionBlockProvenanceClassName(): string {
    return "mt-1 text-[10px] text-muted";
}

export function getExecutionBlockProvenanceToggleLabel(isRevealed: boolean): string {
    return isRevealed ? "Hide Provenance" : "Reveal Provenance";
}
