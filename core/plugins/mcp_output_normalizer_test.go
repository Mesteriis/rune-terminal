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
