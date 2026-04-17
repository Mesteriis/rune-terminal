package workspace

type WidgetKind string

const WidgetKindTerminal WidgetKind = "terminal"
const WidgetKindFiles WidgetKind = "files"

type Widget struct {
	ID           string     `json:"id"`
	Kind         WidgetKind `json:"kind"`
	Title        string     `json:"title"`
	Description  string     `json:"description,omitempty"`
	TerminalID   string     `json:"terminal_id,omitempty"`
	ConnectionID string     `json:"connection_id,omitempty"`
	Path         string     `json:"path,omitempty"`
}

type Tab struct {
	ID           string            `json:"id"`
	Title        string            `json:"title"`
	Description  string            `json:"description,omitempty"`
	Pinned       bool              `json:"pinned"`
	WidgetIDs    []string          `json:"widget_ids"`
	WindowLayout *WindowLayoutNode `json:"window_layout,omitempty"`
}

type Snapshot struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Icon           string   `json:"icon,omitempty"`
	Color          string   `json:"color,omitempty"`
	Tabs           []Tab    `json:"tabs"`
	ActiveTabID    string   `json:"active_tab_id"`
	Widgets        []Widget `json:"widgets"`
	ActiveWidgetID string   `json:"active_widget_id"`
	Layout         Layout   `json:"layout"`
	Layouts        []Layout `json:"layouts"`
	ActiveLayoutID string   `json:"active_layout_id"`
}

type Summary struct {
	OID   string `json:"oid"`
	Name  string `json:"name"`
	Icon  string `json:"icon"`
	Color string `json:"color"`
}

type ListEntry struct {
	WindowID  string  `json:"window_id"`
	Workspace Summary `json:"workspace"`
}
