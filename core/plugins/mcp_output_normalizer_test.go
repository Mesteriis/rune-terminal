package plugins

import (
	"encoding/json"
	"testing"
)

func TestMCPOutputNormalizerNormalizesObjectPayload(t *testing.T) {
	t.Parallel()

	normalizer := DefaultMCPOutputNormalizer()
	output, err := normalizer.Normalize(json.RawMessage(`{"z":1,"a":{"nested":true},"items":[1,2,3]}`))
	if err != nil {
		t.Fatalf("Normalize error: %v", err)
	}
	if output.Format != mcpNormalizedOutputFormat {
		t.Fatalf("unexpected format: %#v", output)
	}
	if output.PayloadType != "object" {
		t.Fatalf("expected object payload, got %#v", output)
	}
	if len(output.ObjectFields) != 3 {
		t.Fatalf("expected 3 normalized fields, got %#v", output.ObjectFields)
	}
	if output.ObjectFields[0].Key != "a" {
		t.Fatalf("expected sorted normalized keys, got %#v", output.ObjectFields)
	}
}

func TestMCPOutputNormalizerNormalizesArrayPayload(t *testing.T) {
	t.Parallel()

	normalizer := DefaultMCPOutputNormalizer()
	output, err := normalizer.Normalize(json.RawMessage(`[1,{"ok":true},"text"]`))
	if err != nil {
		t.Fatalf("Normalize error: %v", err)
	}
	if output.PayloadType != "array" {
		t.Fatalf("expected array payload, got %#v", output)
	}
	if len(output.ArrayItems) != 3 {
		t.Fatalf("expected normalized array items, got %#v", output.ArrayItems)
	}
}

func TestMCPOutputNormalizerHandlesNonJSONPayload(t *testing.T) {
	t.Parallel()

	normalizer := DefaultMCPOutputNormalizer()
	output, err := normalizer.Normalize(json.RawMessage(`not-json`))
	if err != nil {
		t.Fatalf("Normalize error: %v", err)
	}
	if output.PayloadType != "non_json" {
		t.Fatalf("expected non_json payload type, got %#v", output)
	}
	if output.Scalar != "not-json" {
		t.Fatalf("expected scalar preview for non-json payload, got %#v", output)
	}
}

func TestMCPOutputNormalizerEnforcesFieldItemAndStringLimits(t *testing.T) {
	t.Parallel()

	normalizer := MCPOutputNormalizer{
		MaxPayloadBytes: 4096,
		MaxFields:       2,
		MaxItems:        2,
		MaxDepth:        2,
		MaxStringLength: 6,
	}
	output, err := normalizer.Normalize(json.RawMessage(`{
		"one":"123456789",
		"two":[{"nested":{"too":"deep"}},"abcdefghi","tail"],
		"three":true
	}`))
	if err != nil {
		t.Fatalf("Normalize error: %v", err)
	}
	if !output.Truncated {
		t.Fatalf("expected truncation markers, got %#v", output)
	}
	if len(output.ObjectFields) != 3 {
		t.Fatalf("expected capped fields plus summary marker, got %#v", output.ObjectFields)
	}
	if output.ObjectFields[0].Key != "one" {
		t.Fatalf("expected sorted fields, got %#v", output.ObjectFields)
	}
	firstValue := output.ObjectFields[0].Value.Scalar
	firstText, ok := firstValue.(string)
	if !ok || firstText != "123456..." {
		t.Fatalf("expected truncated string scalar, got %#v", firstValue)
	}
}

func TestMCPOutputNormalizerEnforcesPayloadByteLimit(t *testing.T) {
	t.Parallel()

	normalizer := MCPOutputNormalizer{
		MaxPayloadBytes: 8,
		MaxFields:       4,
		MaxItems:        4,
		MaxDepth:        2,
		MaxStringLength: 32,
	}
	output, err := normalizer.Normalize(json.RawMessage(`{"value":"abcdefghijklmnopqrstuvwxyz"}`))
	if err != nil {
		t.Fatalf("Normalize error: %v", err)
	}
	if !output.Truncated {
		t.Fatalf("expected truncated output when payload exceeds max bytes, got %#v", output)
	}
	if output.PayloadType != "non_json" {
		t.Fatalf("expected clipped payload to fall back to non_json preview, got %#v", output)
	}
	if len(output.Notes) == 0 {
		t.Fatalf("expected truncation notes, got %#v", output)
	}
}
