package workspace

type WidgetKind string

const WidgetKindTerminal WidgetKind = "terminal"

type Widget struct {
	ID           string     `json:"id"`
	Kind         WidgetKind `json:"kind"`
	Title        string     `json:"title"`
	Description  string     `json:"description,omitempty"`
	TerminalID   string     `json:"terminal_id,omitempty"`
	ConnectionID string     `json:"connection_id,omitempty"`
}

type Tab struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Pinned      bool     `json:"pinned"`
	WidgetIDs   []string `json:"widget_ids"`
}

type Snapshot struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Tabs           []Tab    `json:"tabs"`
	ActiveTabID    string   `json:"active_tab_id"`
	Widgets        []Widget `json:"widgets"`
	ActiveWidgetID string   `json:"active_widget_id"`
	Layout         Layout   `json:"layout"`
	Layouts        []Layout `json:"layouts"`
	ActiveLayoutID string   `json:"active_layout_id"`
}
