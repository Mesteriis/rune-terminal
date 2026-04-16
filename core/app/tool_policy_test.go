package app

import (
	"encoding/json"
	"testing"
)

func TestAddTrustedRuleToolSchemaExposesRequiredFields(t *testing.T) {
	t.Parallel()

	tool := newRuntimeToolAdapter(&Runtime{}).addTrustedRuleTool()
	var schema map[string]any
	if err := json.Unmarshal(tool.InputSchema, &schema); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}

	required, ok := schema["required"].([]any)
	if !ok || len(required) != 3 {
		t.Fatalf("expected required fields, got %#v", schema["required"])
	}
	if required[0] != "scope" || required[1] != "subject_type" || required[2] != "matcher_type" {
		t.Fatalf("unexpected required fields: %#v", required)
	}

	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected object properties, got %#v", schema["properties"])
	}
	if _, ok := properties["structured"]; !ok {
		t.Fatalf("expected structured matcher schema, got %#v", properties)
	}
}

func TestAddIgnoreRuleToolSchemaExposesRequiredFields(t *testing.T) {
	t.Parallel()

	tool := newRuntimeToolAdapter(&Runtime{}).addIgnoreRuleTool()
	var schema map[string]any
	if err := json.Unmarshal(tool.InputSchema, &schema); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}

	required, ok := schema["required"].([]any)
	if !ok || len(required) != 4 {
		t.Fatalf("expected required fields, got %#v", schema["required"])
	}
	if required[0] != "scope" || required[1] != "matcher_type" || required[2] != "pattern" || required[3] != "mode" {
		t.Fatalf("unexpected required fields: %#v", required)
	}

	properties, ok := schema["properties"].(map[string]any)
	if !ok {
		t.Fatalf("expected object properties, got %#v", schema["properties"])
	}
	modeSchema, ok := properties["mode"].(map[string]any)
	if !ok {
		t.Fatalf("expected mode schema, got %#v", properties["mode"])
	}
	if _, ok := modeSchema["enum"]; !ok {
		t.Fatalf("expected mode enum, got %#v", modeSchema)
	}
}

func TestAddTrustedRuleToolRejectsMissingMatcherAtDecode(t *testing.T) {
	t.Parallel()

	tool := newRuntimeToolAdapter(&Runtime{}).addTrustedRuleTool()
	_, err := tool.Decode(json.RawMessage(`{
		"scope": "repo",
		"subject_type": "tool",
		"matcher_type": "glob"
	}`))
	if err == nil {
		t.Fatalf("expected decode error for missing matcher")
	}
}

func TestAddIgnoreRuleToolRejectsMissingPatternAtDecode(t *testing.T) {
	t.Parallel()

	tool := newRuntimeToolAdapter(&Runtime{}).addIgnoreRuleTool()
	_, err := tool.Decode(json.RawMessage(`{
		"scope": "repo",
		"matcher_type": "glob",
		"mode": "metadata-only"
	}`))
	if err == nil {
		t.Fatalf("expected decode error for missing pattern")
	}
}
