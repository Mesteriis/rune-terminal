package plugins

import (
	"encoding/json"
	"sort"
	"strings"
)

const mcpNormalizedOutputFormat = "mcp.normalized.v1"

type MCPNormalizedField struct {
	Key   string            `json:"key"`
	Value MCPNormalizedNode `json:"value"`
}

type MCPNormalizedNode struct {
	Kind   string               `json:"kind"`
	Fields []MCPNormalizedField `json:"fields,omitempty"`
	Items  []MCPNormalizedNode  `json:"items,omitempty"`
	Scalar any                  `json:"scalar,omitempty"`
}

type MCPNormalizedOutput struct {
	Format        string               `json:"format"`
	PayloadType   string               `json:"payload_type"`
	OriginalBytes int                  `json:"original_bytes"`
	Truncated     bool                 `json:"truncated"`
	ObjectFields  []MCPNormalizedField `json:"object_fields,omitempty"`
	ArrayItems    []MCPNormalizedNode  `json:"array_items,omitempty"`
	Scalar        any                  `json:"scalar,omitempty"`
	Notes         []string             `json:"notes,omitempty"`
}

type MCPOutputNormalizer struct{}

func DefaultMCPOutputNormalizer() MCPOutputNormalizer {
	return MCPOutputNormalizer{}
}

func (n MCPOutputNormalizer) Normalize(raw json.RawMessage) (MCPNormalizedOutput, error) {
	cleaned := strings.TrimSpace(string(raw))
	originalBytes := len(cleaned)
	if cleaned == "" {
		return MCPNormalizedOutput{
			Format:        mcpNormalizedOutputFormat,
			PayloadType:   "empty",
			OriginalBytes: 0,
			Truncated:     false,
			Scalar:        nil,
		}, nil
	}

	var decoded any
	if err := json.Unmarshal([]byte(cleaned), &decoded); err != nil {
		return MCPNormalizedOutput{
			Format:        mcpNormalizedOutputFormat,
			PayloadType:   "non_json",
			OriginalBytes: originalBytes,
			Truncated:     false,
			Scalar:        cleaned,
			Notes:         []string{"payload was not valid JSON and is represented as plain text"},
		}, nil
	}

	normalized := MCPNormalizedOutput{
		Format:        mcpNormalizedOutputFormat,
		OriginalBytes: originalBytes,
		Truncated:     false,
	}
	switch typed := decoded.(type) {
	case map[string]any:
		normalized.PayloadType = "object"
		normalized.ObjectFields = normalizeObject(typed)
	case []any:
		normalized.PayloadType = "array"
		normalized.ArrayItems = normalizeArray(typed)
	default:
		normalized.PayloadType = scalarKind(typed)
		normalized.Scalar = typed
	}
	return normalized, nil
}

func normalizeObject(value map[string]any) []MCPNormalizedField {
	keys := make([]string, 0, len(value))
	for key := range value {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	fields := make([]MCPNormalizedField, 0, len(keys))
	for _, key := range keys {
		fields = append(fields, MCPNormalizedField{
			Key:   key,
			Value: normalizeNode(value[key]),
		})
	}
	return fields
}

func normalizeArray(value []any) []MCPNormalizedNode {
	items := make([]MCPNormalizedNode, 0, len(value))
	for _, item := range value {
		items = append(items, normalizeNode(item))
	}
	return items
}

func normalizeNode(value any) MCPNormalizedNode {
	switch typed := value.(type) {
	case map[string]any:
		return MCPNormalizedNode{
			Kind:   "object",
			Fields: normalizeObject(typed),
		}
	case []any:
		return MCPNormalizedNode{
			Kind:  "array",
			Items: normalizeArray(typed),
		}
	default:
		return MCPNormalizedNode{
			Kind:   "scalar",
			Scalar: typed,
		}
	}
}

func scalarKind(value any) string {
	switch value.(type) {
	case nil:
		return "null"
	case bool:
		return "boolean"
	case float64:
		return "number"
	case string:
		return "string"
	default:
		return "scalar"
	}
}
