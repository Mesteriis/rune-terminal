package workspace

type WidgetKindStatus string

const (
	WidgetKindStatusAvailable     WidgetKindStatus = "available"
	WidgetKindStatusFrontendLocal WidgetKindStatus = "frontend-local"
	WidgetKindStatusPlanned       WidgetKindStatus = "planned"
)

type WidgetKindCatalogEntry struct {
	Kind                WidgetKind       `json:"kind"`
	Label               string           `json:"label"`
	Description         string           `json:"description"`
	Status              WidgetKindStatus `json:"status"`
	RuntimeOwned        bool             `json:"runtime_owned"`
	CanCreate           bool             `json:"can_create"`
	SupportsConnections bool             `json:"supports_connections"`
	SupportsPath        bool             `json:"supports_path"`
	DefaultTitle        string           `json:"default_title"`
	CreateRoute         string           `json:"create_route,omitempty"`
	Notes               string           `json:"notes,omitempty"`
}

var defaultWidgetKindCatalog = []WidgetKindCatalogEntry{
	{
		Kind:                WidgetKindTerminal,
		Label:               "Terminal",
		Description:         "Backend-owned local or SSH terminal session rendered by the active terminal widget.",
		Status:              WidgetKindStatusAvailable,
		RuntimeOwned:        true,
		CanCreate:           true,
		SupportsConnections: true,
		DefaultTitle:        "Terminal",
		CreateRoute:         "/api/v1/workspace/tabs",
	},
	{
		Kind:                WidgetKindFiles,
		Label:               "Files",
		Description:         "Backend-owned directory widget created from an explicit path handoff.",
		Status:              WidgetKindStatusAvailable,
		RuntimeOwned:        true,
		CanCreate:           true,
		SupportsConnections: true,
		SupportsPath:        true,
		DefaultTitle:        "Files",
		CreateRoute:         "/api/v1/workspace/widgets/open-directory",
		Notes:               "The current active frontend rendering is narrower than TideTerm's full preview/file block surface.",
	},
	{
		Kind:         WidgetKindCommander,
		Label:        "Commander",
		Description:  "Dual-pane local file manager currently mounted by the frontend Dockview shell.",
		Status:       WidgetKindStatusFrontendLocal,
		DefaultTitle: "Commander",
		Notes:        "Active UI exists, but this kind is not yet persisted as backend workspace truth.",
	},
	{
		Kind:         WidgetKindPreview,
		Label:        "Preview",
		Description:  "Planned standalone rich preview widget for text, markdown, images, media, and binary metadata.",
		Status:       WidgetKindStatusPlanned,
		DefaultTitle: "Preview",
	},
	{
		Kind:         WidgetKindEditor,
		Label:        "Editor",
		Description:  "Planned backend-owned text editor widget with save/dirty-state semantics.",
		Status:       WidgetKindStatusPlanned,
		DefaultTitle: "Editor",
	},
	{
		Kind:         WidgetKindWeb,
		Label:        "Web Placeholder",
		Description:  "Planned web/navigation widget placeholder; no active runtime contract yet.",
		Status:       WidgetKindStatusPlanned,
		DefaultTitle: "Web",
	},
}

func WidgetKindCatalog() []WidgetKindCatalogEntry {
	return append([]WidgetKindCatalogEntry(nil), defaultWidgetKindCatalog...)
}
