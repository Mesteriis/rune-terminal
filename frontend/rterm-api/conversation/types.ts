export type MessageRole = "system" | "user" | "assistant" | (string & {});

export interface ProviderInfo {
  kind: string;
  base_url: string;
  model?: string;
  streaming: boolean;
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  attachments?: AttachmentReference[];
  status: "complete" | "error" | (string & {});
  provider?: string;
  model?: string;
  created_at: string;
}

export interface AttachmentReference {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  modified_time: number;
}

export interface ConversationSnapshot {
  messages: ConversationMessage[];
  provider: ProviderInfo;
  updated_at: string;
}

export interface ConversationSnapshotResponse {
  conversation: ConversationSnapshot;
}

export interface ConversationContext {
  workspace_id?: string;
  repo_root?: string;
  active_widget_id?: string;
  widget_context_enabled?: boolean;
}

export interface SubmitConversationMessageRequest {
  prompt: string;
  context?: ConversationContext;
  attachments?: AttachmentReference[];
}

export interface SubmitConversationMessageResponse {
  conversation: ConversationSnapshot;
  provider_error: string;
}

export interface ExplainTerminalCommandRequest {
  prompt: string;
  command: string;
  widget_id?: string;
  from_seq?: number;
  approval_used?: boolean;
  context: ConversationContext;
}

export interface ExplainTerminalCommandResponse {
  conversation: ConversationSnapshot;
  provider_error: string;
  output_excerpt: string;
}

export interface CreateAttachmentReferenceRequest {
  path: string;
}

export interface CreateAttachmentReferenceResponse {
  attachment: AttachmentReference;
}
