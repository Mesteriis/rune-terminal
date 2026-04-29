package app

import (
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/audit"
)

type pluginCatalogAuditInput struct {
	Action  string
	Record  InstalledPluginRecord
	Source  PluginInstallSource
	Actor   PluginActor
	Success bool
	Error   error
}

func (r *Runtime) appendPluginCatalogAudit(input pluginCatalogAuditInput) {
	if r == nil || r.Audit == nil {
		return
	}
	action := strings.TrimSpace(input.Action)
	if action == "" {
		action = "mutation"
	}
	record := input.Record
	source := input.Source
	if strings.TrimSpace(source.Kind.String()) == "" {
		source = record.Source
	}
	event := audit.Event{
		ToolName:      "plugin." + action,
		Summary:       pluginCatalogAuditSummary(action, record, source, input.Actor),
		ActionSource:  "plugin.catalog",
		AffectedPaths: normalizeFSAuditPaths([]string{record.InstallRoot}),
		Success:       input.Success,
		Error:         errorString(input.Error),
	}
	_ = r.Audit.Append(event)
}

func pluginCatalogAuditSummary(
	action string,
	record InstalledPluginRecord,
	source PluginInstallSource,
	actor PluginActor,
) string {
	parts := []string{
		fmt.Sprintf("action=%s", strings.TrimSpace(action)),
	}
	if id := strings.TrimSpace(record.ID); id != "" {
		parts = append(parts, "plugin_id="+id)
	}
	if status := strings.TrimSpace(string(record.RuntimeStatus)); status != "" {
		parts = append(parts, "status="+status)
	}
	if kind := strings.TrimSpace(source.Kind.String()); kind != "" {
		parts = append(parts, "source_kind="+kind)
	}
	if url := strings.TrimSpace(source.URL); url != "" {
		parts = append(parts, "source_url="+url)
	}
	if ref := strings.TrimSpace(source.Ref); ref != "" {
		parts = append(parts, "source_ref="+ref)
	}
	if username := strings.TrimSpace(actor.Username); username != "" {
		parts = append(parts, "actor="+username)
	}
	return strings.Join(parts, " ")
}

func (kind PluginInstallSourceKind) String() string {
	return string(kind)
}
