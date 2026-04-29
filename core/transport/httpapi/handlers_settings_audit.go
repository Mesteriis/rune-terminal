package httpapi

import (
	"strings"

	"github.com/Mesteriis/rune-terminal/core/app"
)

func (api *API) appendSettingsAudit(area string, fields []string, success bool, err error) {
	api.runtime.AppendSettingsAudit(app.SettingsAuditInput{
		Area:         area,
		Summary:      settingsAuditSummary(fields),
		ActionSource: "http.settings",
		Success:      success,
		Error:        err,
	})
}

func settingsAuditSummary(fields []string) string {
	normalized := make([]string, 0, len(fields))
	seen := make(map[string]struct{}, len(fields))
	for _, rawField := range fields {
		field := strings.TrimSpace(rawField)
		if field == "" {
			continue
		}
		if _, ok := seen[field]; ok {
			continue
		}
		seen[field] = struct{}{}
		normalized = append(normalized, field)
	}
	if len(normalized) == 0 {
		return "fields=none"
	}
	return "fields=" + strings.Join(normalized, ",")
}
