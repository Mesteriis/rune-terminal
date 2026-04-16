package plugins

import (
	"bytes"
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

type MCPOutputNormalizer struct {
	MaxPayloadBytes int
	MaxFields       int
	MaxItems        int
	MaxDepth        int
	MaxStringLength int
}

func DefaultMCPOutputNormalizer() MCPOutputNormalizer {
	return MCPOutputNormalizer{
		MaxPayloadBytes: 8192,
		MaxFields:       12,
		MaxItems:        12,
		MaxDepth:        3,
		MaxStringLength: 256,
	}
}

func (n MCPOutputNormalizer) Normalize(raw json.RawMessage) (MCPNormalizedOutput, error) {
	normalizer := n.withDefaults()
	cleaned := bytes.TrimSpace(raw)
	originalBytes := len(cleaned)
	if originalBytes == 0 {
		return MCPNormalizedOutput{
			Format:        mcpNormalizedOutputFormat,
			PayloadType:   "empty",
			OriginalBytes: 0,
			Truncated:     false,
			Scalar:        nil,
		}, nil
	}
	truncated := false
	notes := make([]string, 0, 2)
	if len(cleaned) > normalizer.MaxPayloadBytes {
		cleaned = cleaned[:normalizer.MaxPayloadBytes]
		truncated = true
		notes = append(notes, "payload clipped to max bytes")
	}

	var decoded any
	if err := json.Unmarshal(cleaned, &decoded); err != nil {
		preview := normalizer.truncateString(string(cleaned), &truncated)
		return MCPNormalizedOutput{
			Format:        mcpNormalizedOutputFormat,
			PayloadType:   "non_json",
			OriginalBytes: originalBytes,
			Truncated:     truncated,
			Scalar:        preview,
			Notes: append(notes,
				"payload was not valid JSON and is represented as plain text",
			),
		}, nil
	}

	normalized := MCPNormalizedOutput{
		Format:        mcpNormalizedOutputFormat,
		OriginalBytes: originalBytes,
		Truncated:     truncated,
	}
	switch typed := decoded.(type) {
	case map[string]any:
		normalized.PayloadType = "object"
		normalized.ObjectFields = normalizer.normalizeObject(typed, 0, &truncated)
	case []any:
		normalized.PayloadType = "array"
		normalized.ArrayItems = normalizer.normalizeArray(typed, 0, &truncated)
	default:
		normalized.PayloadType = scalarKind(typed)
		normalized.Scalar = normalizer.normalizeScalar(typed, &truncated)
	}
	if truncated {
		normalized.Truncated = true
	}
	if len(notes) > 0 {
		normalized.Notes = append(normalized.Notes, notes...)
	}
	return normalized, nil
}

func (n MCPOutputNormalizer) withDefaults() MCPOutputNormalizer {
	out := n
	if out.MaxPayloadBytes <= 0 {
		out.MaxPayloadBytes = 8192
	}
	if out.MaxFields <= 0 {
		out.MaxFields = 12
	}
	if out.MaxItems <= 0 {
		out.MaxItems = 12
	}
	if out.MaxDepth <= 0 {
		out.MaxDepth = 3
	}
	if out.MaxStringLength <= 0 {
		out.MaxStringLength = 256
	}
	return out
}

func (n MCPOutputNormalizer) normalizeObject(value map[string]any, depth int, truncated *bool) []MCPNormalizedField {
	if depth >= n.MaxDepth {
		*truncated = true
		return []MCPNormalizedField{
			{
				Key: "summary",
				Value: MCPNormalizedNode{
					Kind:   "scalar",
					Scalar: "object omitted at max depth",
				},
			},
		}
	}
	keys := make([]string, 0, len(value))
	for key := range value {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	limit := minInt(len(keys), n.MaxFields)
	if len(keys) > limit {
		*truncated = true
	}
	fields := make([]MCPNormalizedField, 0, limit+1)
	for _, key := range keys[:limit] {
		fields = append(fields, MCPNormalizedField{
			Key:   key,
			Value: n.normalizeNode(value[key], depth+1, truncated),
		})
	}
	if len(keys) > limit {
		fields = append(fields, MCPNormalizedField{
			Key: "summary",
			Value: MCPNormalizedNode{
				Kind:   "scalar",
				Scalar: "additional fields omitted",
			},
		})
	}
	return fields
}

func (n MCPOutputNormalizer) normalizeArray(value []any, depth int, truncated *bool) []MCPNormalizedNode {
	if depth >= n.MaxDepth {
		*truncated = true
		return []MCPNormalizedNode{{
			Kind:   "scalar",
			Scalar: "array omitted at max depth",
		}}
	}
	limit := minInt(len(value), n.MaxItems)
	if len(value) > limit {
		*truncated = true
	}
	items := make([]MCPNormalizedNode, 0, limit+1)
	for _, item := range value[:limit] {
		items = append(items, n.normalizeNode(item, depth+1, truncated))
	}
	if len(value) > limit {
		items = append(items, MCPNormalizedNode{
			Kind:   "scalar",
			Scalar: "additional items omitted",
		})
	}
	return items
}

func (n MCPOutputNormalizer) normalizeNode(value any, depth int, truncated *bool) MCPNormalizedNode {
	switch typed := value.(type) {
	case map[string]any:
		return MCPNormalizedNode{
			Kind:   "object",
			Fields: n.normalizeObject(typed, depth, truncated),
		}
	case []any:
		return MCPNormalizedNode{
			Kind:  "array",
			Items: n.normalizeArray(typed, depth, truncated),
		}
	default:
		return MCPNormalizedNode{
			Kind:   "scalar",
			Scalar: n.normalizeScalar(typed, truncated),
		}
	}
}

func (n MCPOutputNormalizer) normalizeScalar(value any, truncated *bool) any {
	switch typed := value.(type) {
	case string:
		return n.truncateString(strings.TrimSpace(typed), truncated)
	default:
		return typed
	}
}

func (n MCPOutputNormalizer) truncateString(value string, truncated *bool) string {
	if len(value) <= n.MaxStringLength {
		return value
	}
	*truncated = true
	return value[:n.MaxStringLength] + "..."
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
