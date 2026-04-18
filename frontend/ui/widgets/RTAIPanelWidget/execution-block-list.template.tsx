import { memo, useState } from "react";
import {
    type ExecutionBlockListProps,
    formatExecutionBlockTime,
    getExecutionBlockActionButtonClassName,
    getExecutionBlockActionsClassName,
    getExecutionBlockBusyClassName,
    getExecutionBlockCommandClassName,
    getExecutionBlockCountClassName,
    getExecutionBlockExplainClassName,
    getExecutionBlockHeaderClassName,
    getExecutionBlockItemClassName,
    getExecutionBlockItemHeaderClassName,
    getExecutionBlockItemsClassName,
    getExecutionBlockMetaClassName,
    getExecutionBlockOutputClassName,
    getExecutionBlockPendingActionButtonClassName,
    getExecutionBlockProvenanceClassName,
    getExecutionBlockProvenanceToggleLabel,
    getExecutionBlockSectionClassName,
    getExecutionBlockStateClassName,
    getExecutionBlockTitleClassName,
    summarizeExecutionBlockExplain,
} from "./execution-block-list.logic";
import "./execution-block-list.style.scss";

export const ExecutionBlockList = memo(({ blocks, busyBlockID, onExplain, onRerun, onCopyCommand }: ExecutionBlockListProps) => {
    const [revealed, setRevealed] = useState<Record<string, boolean>>({});
    if (blocks.length === 0) {
        return null;
    }

    return (
        <section className={getExecutionBlockSectionClassName()} data-testid="execution-block-list">
            <div className={getExecutionBlockHeaderClassName()}>
                <h3 className={getExecutionBlockTitleClassName()}>Structured execution</h3>
                <span className={getExecutionBlockCountClassName()}>{blocks.length} recent</span>
            </div>
            <div className={getExecutionBlockItemsClassName()}>
                {blocks.map((block) => {
                    const isBusy = busyBlockID === block.id;
                    const isRevealed = revealed[block.id] === true;
                    return (
                        <article key={block.id} className={getExecutionBlockItemClassName()} data-testid="execution-block-item">
                            <div className={getExecutionBlockItemHeaderClassName()}>
                                <code className={getExecutionBlockCommandClassName()}>{block.intent.command}</code>
                                <span className={getExecutionBlockStateClassName(block.result.state)} data-testid="execution-block-state">
                                    {block.result.state}
                                </span>
                            </div>
                            <div className={getExecutionBlockMetaClassName()}>
                                {block.target.target_session || "local"} · {block.target.target_connection_id || "local"} ·{" "}
                                {formatExecutionBlockTime(block.created_at)}
                            </div>
                            {block.result.output_excerpt ? (
                                <pre className={getExecutionBlockOutputClassName()}>{block.result.output_excerpt}</pre>
                            ) : null}
                            <div className={getExecutionBlockExplainClassName()}>{summarizeExecutionBlockExplain(block)}</div>
                            <div className={getExecutionBlockActionsClassName()}>
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    className={getExecutionBlockPendingActionButtonClassName()}
                                    onClick={() => onExplain(block)}
                                >
                                    Explain
                                </button>
                                <button
                                    type="button"
                                    disabled={isBusy}
                                    className={getExecutionBlockPendingActionButtonClassName()}
                                    onClick={() => onRerun(block)}
                                >
                                    Re-run
                                </button>
                                <button
                                    type="button"
                                    className={getExecutionBlockActionButtonClassName()}
                                    onClick={() => onCopyCommand(block)}
                                >
                                    Copy
                                </button>
                                <button
                                    type="button"
                                    className={getExecutionBlockActionButtonClassName()}
                                    onClick={() => {
                                        setRevealed((previous) => ({
                                            ...previous,
                                            [block.id]: !previous[block.id],
                                        }));
                                    }}
                                >
                                    {getExecutionBlockProvenanceToggleLabel(isRevealed)}
                                </button>
                                {isBusy ? <span className={getExecutionBlockBusyClassName()}>processing…</span> : null}
                            </div>
                            {isRevealed ? (
                                <div className={getExecutionBlockProvenanceClassName()}>
                                    explain message {block.explain.message_id || "n/a"} · command audit{" "}
                                    {block.provenance.command_audit_event_id || "n/a"} · explain audit{" "}
                                    {block.provenance.explain_audit_event_id || "n/a"}
                                </div>
                            ) : null}
                        </article>
                    );
                })}
            </div>
        </section>
    );
});

ExecutionBlockList.displayName = "ExecutionBlockList";
