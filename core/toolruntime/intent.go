package toolruntime

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

type executionIntent struct {
	ToolName string                   `json:"tool_name"`
	Input    any                      `json:"input"`
	Context  ExecutionEnvelopeContext `json:"context,omitempty"`
}

func executionIntentHash(envelope ExecutionEnvelope, input any) (string, error) {
	intent := executionIntent{
		ToolName: envelope.ToolName,
		Input:    normalizeExecutionIntentInput(input),
		Context:  envelope.Context,
	}
	payload, err := json.Marshal(intent)
	if err != nil {
		return "", err
	}
	sum := sha256.Sum256(payload)
	return hex.EncodeToString(sum[:]), nil
}

func normalizeExecutionIntentInput(input any) any {
	if input == nil {
		return struct{}{}
	}
	return input
}
