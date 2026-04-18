import type { ExecutionBlock } from "@/compat/execution";
import { useState } from "react";
import { ExecutionBlockList } from "./execution-block-list";

const initialBlocks: ExecutionBlock[] = [
    {
        id: "block-1",
        intent: {
            prompt: "/run git status",
            command: "git status",
        },
        target: {
            workspace_id: "workspace-main",
            widget_id: "term-main",
            target_session: "session-main",
            target_connection_id: "conn-main",
        },
        result: {
            state: "executed",
            output_excerpt: "On branch main\nnothing to commit, working tree clean",
            from_seq: 42,
        },
        explain: {
            state: "available",
            message_id: "msg-1",
            summary: "The repository is clean and there are no pending file changes.",
        },
        provenance: {
            command_audit_event_id: "audit-command-1",
            explain_audit_event_id: "audit-explain-1",
        },
        created_at: "2026-04-18T10:30:00.000Z",
        updated_at: "2026-04-18T10:30:02.000Z",
    },
    {
        id: "block-2",
        intent: {
            prompt: "/run npm test",
            command: "npm test",
        },
        target: {
            workspace_id: "workspace-main",
            widget_id: "term-main",
        },
        result: {
            state: "failed",
            output_excerpt: "Error: expected 0 failed tests but received 1",
            from_seq: 57,
        },
        explain: {
            state: "failed",
            error: "The test suite failed because one expectation did not match.",
        },
        provenance: {
            command_audit_event_id: "audit-command-2",
        },
        created_at: "2026-04-18T10:35:00.000Z",
        updated_at: "2026-04-18T10:35:03.000Z",
    },
];

function ExecutionBlockListStory() {
    const [busyBlockID, setBusyBlockID] = useState<string | undefined>();
    const [lastAction, setLastAction] = useState<string>("None");

    function handleExplain(block: ExecutionBlock) {
        setBusyBlockID(block.id);
        setLastAction(`Explain: ${block.intent.command}`);
    }

    function handleRerun(block: ExecutionBlock) {
        setBusyBlockID(block.id);
        setLastAction(`Re-run: ${block.intent.command}`);
    }

    function handleCopyCommand(block: ExecutionBlock) {
        setLastAction(`Copy: ${block.intent.command}`);
    }

    return (
        <div style={{ padding: 12, maxWidth: 720, backgroundColor: "#111827", color: "#ffffff" }}>
            <ExecutionBlockList
                blocks={initialBlocks}
                busyBlockID={busyBlockID}
                onExplain={handleExplain}
                onRerun={handleRerun}
                onCopyCommand={handleCopyCommand}
            />
            <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>Last action: {lastAction}</div>
        </div>
    );
}

export default ExecutionBlockListStory;
