import type { ExecutionBlock } from "@/compat/execution";
import { memo } from "react";

interface ExecutionBlockListProps {
    blocks: ExecutionBlock[];
}

function formatTime(value: string): string {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
        return value;
    }
    return new Date(timestamp).toLocaleTimeString();
}

function summarizeExplain(block: ExecutionBlock): string {
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

export const ExecutionBlockList = memo(({ blocks }: ExecutionBlockListProps) => {
    if (blocks.length === 0) {
        return null;
    }

    return (
        <section className="border-t border-b border-border/60 bg-black/20 px-3 py-2" data-testid="execution-block-list">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] uppercase tracking-wide text-secondary">Structured execution</h3>
                <span className="text-[10px] text-muted">{blocks.length} recent</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {blocks.map((block) => {
                    const stateClass = block.result.state === "executed" ? "text-emerald-300" : "text-amber-300";
                    return (
                        <article
                            key={block.id}
                            className="rounded border border-border/70 bg-zinc-950/60 px-2 py-1.5"
                            data-testid="execution-block-item"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <code className="text-[11px] text-primary break-all">{block.intent.command}</code>
                                <span className={`text-[10px] uppercase ${stateClass}`} data-testid="execution-block-state">
                                    {block.result.state}
                                </span>
                            </div>
                            <div className="mt-1 text-[10px] text-muted">
                                {block.target.target_session || "local"} · {block.target.target_connection_id || "local"} ·{" "}
                                {formatTime(block.created_at)}
                            </div>
                            {block.result.output_excerpt ? (
                                <pre className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-zinc-300">
                                    {block.result.output_excerpt}
                                </pre>
                            ) : null}
                            <div className="mt-1 text-[10px] text-zinc-300">{summarizeExplain(block)}</div>
                            <div className="mt-1 text-[10px] text-muted">
                                explain {block.explain.message_id || "n/a"} · audit {block.provenance.command_audit_event_id || "n/a"}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
});

ExecutionBlockList.displayName = "ExecutionBlockList";

