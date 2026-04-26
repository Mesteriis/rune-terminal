package app

import (
	"context"
	"errors"
	"strings"
	"sync"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

var ErrConversationStreamNotFound = errors.New("conversation stream not found")

type conversationStreamCanceller = context.CancelCauseFunc

type conversationStreamRegistry struct {
	mu      sync.Mutex
	streams map[string]conversationStreamCanceller
}

func newConversationStreamRegistry() conversationStreamRegistry {
	return conversationStreamRegistry{
		streams: make(map[string]conversationStreamCanceller),
	}
}

func (r *Runtime) RegisterConversationStream(streamID string, cancel conversationStreamCanceller) {
	streamID = strings.TrimSpace(streamID)
	if streamID == "" || cancel == nil {
		return
	}

	r.conversationStreams.mu.Lock()
	defer r.conversationStreams.mu.Unlock()
	if r.conversationStreams.streams == nil {
		r.conversationStreams.streams = make(map[string]conversationStreamCanceller)
	}
	r.conversationStreams.streams[streamID] = cancel
}

func (r *Runtime) ReleaseConversationStream(streamID string) {
	streamID = strings.TrimSpace(streamID)
	if streamID == "" {
		return
	}

	r.conversationStreams.mu.Lock()
	defer r.conversationStreams.mu.Unlock()
	delete(r.conversationStreams.streams, streamID)
}

func (r *Runtime) CancelConversationStream(streamID string) error {
	streamID = strings.TrimSpace(streamID)
	if streamID == "" {
		return ErrConversationStreamNotFound
	}

	r.conversationStreams.mu.Lock()
	cancel, ok := r.conversationStreams.streams[streamID]
	r.conversationStreams.mu.Unlock()
	if !ok {
		return ErrConversationStreamNotFound
	}

	cancel(conversation.ErrConversationStreamCancelled)
	return nil
}
