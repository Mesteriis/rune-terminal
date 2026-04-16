export type ExecutionBlockState = "executed" | "failed" | (string & {});
export type ExecutionBlockExplainState = "available" | "failed" | (string & {});

export interface ExecutionBlock {
  id: string;
  intent: {
    prompt: string;
    command: string;
  };
  target: {
    workspace_id?: string;
    widget_id?: string;
    repo_root?: string;
    target_session?: string;
    target_connection_id?: string;
  };
  result: {
    state: ExecutionBlockState;
    output_excerpt?: string;
    from_seq?: number;
  };
  explain: {
    state: ExecutionBlockExplainState;
    message_id?: string;
    summary?: string;
    error?: string;
  };
  provenance: {
    command_audit_event_id?: string;
    explain_audit_event_id?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ExecutionBlocksListResponse {
  blocks: ExecutionBlock[];
}

export interface ExecutionBlockResponse {
  block: ExecutionBlock;
}
