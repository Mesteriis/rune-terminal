package toolruntime

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

type executionIntent struct {
	ToolName string           `json:"tool_name"`
	Input    any              `json:"input"`
	Context  ExecutionContext `json:"context,omitempty"`
}

func executionIntentHash(toolName string, input any, context ExecutionContext) (string, error) {
	intent := executionIntent{
		ToolName: toolName,
		Input:    normalizeExecutionIntentInput(input),
		Context:  context,
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
