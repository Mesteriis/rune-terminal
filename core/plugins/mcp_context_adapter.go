package plugins

import (
	"bytes"
	"encoding/json"
	"sort"
	"strings"
)

type MCPContextPayload struct {
	Included      bool `json:"included"`
	Truncated     bool `json:"truncated"`
	OriginalBytes int  `json:"original_bytes"`
	Payload       any  `json:"payload,omitempty"`
}

type MCPContextAdapter struct {
	MaxBytes  int
	MaxDepth  int
	MaxItems  int
	MaxString int
}

func DefaultMCPContextAdapter() MCPContextAdapter {
	return MCPContextAdapter{
		MaxBytes:  4096,
		MaxDepth:  3,
		MaxItems:  8,
		MaxString: 256,
	}
}

func (a MCPContextAdapter) Adapt(raw json.RawMessage) (MCPContextPayload, error) {
	adapter := a.withDefaults()
	cleaned := bytes.TrimSpace(raw)
	if len(cleaned) == 0 {
		return MCPContextPayload{
			Included:      true,
			Truncated:     false,
			OriginalBytes: 0,
			Payload:       map[string]any{},
		}, nil
	}

	var decoded any
	if err := json.Unmarshal(cleaned, &decoded); err != nil {
		preview := string(cleaned)
		if len(preview) > adapter.MaxString {
			preview = preview[:adapter.MaxString] + "..."
		}
		return MCPContextPayload{
			Included:      true,
			Truncated:     len(cleaned) > adapter.MaxString,
			OriginalBytes: len(cleaned),
			Payload: map[string]any{
				"summary": "non-json mcp payload",
				"preview": preview,
			},
		}, nil
	}

	minimal := adapter.minimize(decoded, 0)
	encoded, err := json.Marshal(minimal)
	if err != nil {
		return MCPContextPayload{}, err
	}
	if len(encoded) > adapter.MaxBytes {
		preview := string(encoded[:adapter.MaxBytes])
		return MCPContextPayload{
			Included:      true,
			Truncated:     true,
			OriginalBytes: len(cleaned),
			Payload: map[string]any{
				"summary": "mcp payload truncated",
				"preview": preview,
			},
		}, nil
	}

	return MCPContextPayload{
		Included:      true,
		Truncated:     false,
		OriginalBytes: len(cleaned),
		Payload:       minimal,
	}, nil
}

func (a MCPContextAdapter) withDefaults() MCPContextAdapter {
	out := a
	if out.MaxBytes <= 0 {
		out.MaxBytes = 4096
	}
	if out.MaxDepth <= 0 {
		out.MaxDepth = 3
	}
	if out.MaxItems <= 0 {
		out.MaxItems = 8
	}
	if out.MaxString <= 0 {
		out.MaxString = 256
	}
	return out
}

func (a MCPContextAdapter) minimize(value any, depth int) any {
	if depth >= a.MaxDepth {
		switch typed := value.(type) {
		case map[string]any:
			return map[string]any{
				"summary": "object omitted at max depth",
				"size":    len(typed),
			}
		case []any:
			return map[string]any{
				"summary": "array omitted at max depth",
				"size":    len(typed),
			}
		default:
			return a.minimizeScalar(typed)
		}
	}

	switch typed := value.(type) {
	case map[string]any:
		keys := make([]string, 0, len(typed))
		for key := range typed {
			keys = append(keys, key)
		}
		sort.Strings(keys)
		out := make(map[string]any, minInt(len(keys), a.MaxItems)+1)
		limit := minInt(len(keys), a.MaxItems)
		for i := 0; i < limit; i++ {
			key := keys[i]
			out[key] = a.minimize(typed[key], depth+1)
		}
		if len(keys) > a.MaxItems {
			out["_trimmed_fields"] = len(keys) - a.MaxItems
		}
		return out
	case []any:
		limit := minInt(len(typed), a.MaxItems)
		out := make([]any, 0, limit+1)
		for i := 0; i < limit; i++ {
			out = append(out, a.minimize(typed[i], depth+1))
		}
		if len(typed) > a.MaxItems {
			out = append(out, map[string]any{
				"summary": "array truncated",
				"omitted": len(typed) - a.MaxItems,
			})
		}
		return out
	default:
		return a.minimizeScalar(typed)
	}
}

func (a MCPContextAdapter) minimizeScalar(value any) any {
	switch typed := value.(type) {
	case string:
		text := strings.TrimSpace(typed)
		if len(text) > a.MaxString {
			return text[:a.MaxString] + "..."
		}
		return text
	default:
		return value
	}
}

func minInt(left int, right int) int {
	if left < right {
		return left
	}
	return right
}
