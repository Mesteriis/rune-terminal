import type { ConversationClient } from "@/rterm-api/conversation/client";
import type {
  ConversationSnapshotResponse,
  ExplainTerminalCommandRequest,
  ExplainTerminalCommandResponse,
  SubmitConversationMessageRequest,
  SubmitConversationMessageResponse,
} from "@/rterm-api/conversation/types";
import type { CompatApiOptions } from "./types";
import { createCompatApiFacade } from "./api";

export interface ConversationFacade {
  getSnapshot: () => Promise<ConversationSnapshotResponse>;
  submitMessage: (payload: SubmitConversationMessageRequest) => Promise<SubmitConversationMessageResponse>;
  explainTerminalCommand: (payload: ExplainTerminalCommandRequest) => Promise<ExplainTerminalCommandResponse>;
}

let conversationFacadePromise: Promise<ConversationFacade> | null = null;

function buildConversationFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ConversationFacade> {
  const facadePromise = createCompatApiFacade({ fetchImpl }).then(({ clients }) => {
    return createConversationFacade(clients.conversation);
  });
  facadePromise.catch(() => {
    conversationFacadePromise = null;
  });
  return facadePromise;
}

export function getConversationFacade(fetchImpl?: CompatApiOptions["fetchImpl"]): Promise<ConversationFacade> {
  if (conversationFacadePromise == null) {
    conversationFacadePromise = buildConversationFacade(fetchImpl);
  }
  return conversationFacadePromise;
}

export function createConversationFacade(client: ConversationClient): ConversationFacade {
  return {
    getSnapshot(): Promise<ConversationSnapshotResponse> {
      return client.getSnapshot();
    },
    submitMessage(payload: SubmitConversationMessageRequest): Promise<SubmitConversationMessageResponse> {
      return client.submitMessage(payload);
    },
    explainTerminalCommand(payload: ExplainTerminalCommandRequest): Promise<ExplainTerminalCommandResponse> {
      return client.explainTerminalCommand(payload);
    },
  };
}
