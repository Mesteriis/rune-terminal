package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDecodeJSONRejectsOversizedBodies(t *testing.T) {
	t.Parallel()

	body := `{"value":"` + strings.Repeat("a", int(maxJSONBodyBytes)) + `"}`
	request := httptest.NewRequest("POST", "/api/v1/test", strings.NewReader(body))
	var payload struct {
		Value string `json:"value"`
	}

	if err := decodeJSON(request, &payload); err == nil {
		t.Fatal("expected oversized body error")
	}
}
