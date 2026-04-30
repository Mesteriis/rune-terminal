package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestSettingsMutationHandlersAppendAuditEvents(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	tests := []struct {
		name    string
		path    string
		payload map[string]any
		tool    string
		summary string
	}{
		{
			name:    "agent",
			path:    "/api/v1/settings/agent",
			payload: map[string]any{"composer_submit_mode": "mod-enter-sends", "debug_mode_enabled": true},
			tool:    "settings.agent.update",
			summary: "fields=composer_submit_mode,debug_mode_enabled",
		},
		{
			name:    "terminal",
			path:    "/api/v1/settings/terminal",
			payload: map[string]any{"font_size": 15, "theme_mode": "contrast"},
			tool:    "settings.terminal.update",
			summary: "fields=font_size,theme_mode",
		},
		{
			name:    "window title",
			path:    "/api/v1/settings/window-title",
			payload: map[string]any{"mode": "custom", "custom_title": "Ops Window"},
			tool:    "settings.window_title.update",
			summary: "fields=mode,custom_title",
		},
		{
			name:    "locale",
			path:    "/api/v1/settings/locale",
			payload: map[string]any{"locale": "en"},
			tool:    "settings.locale.update",
			summary: "fields=locale",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, tt.path, tt.payload))
			if recorder.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d (%s)", recorder.Code, recorder.Body.String())
			}
		})
	}

	events := decodeWorkspaceAuditEvents(t, handler, 10)
	if len(events) != len(tests) {
		t.Fatalf("expected %d settings audit events, got %#v", len(tests), events)
	}
	for index, tt := range tests {
		event := events[index]
		if event.ToolName != tt.tool || event.ActionSource != "http.settings" || !event.Success || event.Error != "" {
			t.Fatalf("unexpected settings audit event %d: %#v", index, event)
		}
		if event.Summary != tt.summary {
			t.Fatalf("expected summary %q for event %d, got %#v", tt.summary, index, event)
		}
	}
}

func TestSettingsMutationHandlersAppendFailureAuditEvents(t *testing.T) {
	t.Parallel()

	handler, _ := newTestHandler(t)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, authedJSONRequest(t, http.MethodPut, "/api/v1/settings/terminal", map[string]any{}))
	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d (%s)", recorder.Code, recorder.Body.String())
	}

	events := decodeWorkspaceAuditEvents(t, handler, 10)
	if len(events) != 1 {
		t.Fatalf("expected one settings failure audit event, got %#v", events)
	}
	event := events[0]
	if event.ToolName != "settings.terminal.update" || event.ActionSource != "http.settings" ||
		event.Success || event.Error == "" {
		t.Fatalf("unexpected settings failure audit event: %#v", event)
	}
	if event.Summary != "fields=none" {
		t.Fatalf("expected missing-fields summary in failure audit event, got %#v", event)
	}
}
