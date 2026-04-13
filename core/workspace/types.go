package workspace

type WidgetKind string

const WidgetKindTerminal WidgetKind = "terminal"

type Widget struct {
	ID          string     `json:"id"`
	Kind        WidgetKind `json:"kind"`
	Title       string     `json:"title"`
	Description string     `json:"description,omitempty"`
	TerminalID  string     `json:"terminal_id,omitempty"`
}

type Tab struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	WidgetIDs   []string `json:"widget_ids"`
}

type Snapshot struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Tabs           []Tab    `json:"tabs"`
	ActiveTabID    string   `json:"active_tab_id"`
	Widgets        []Widget `json:"widgets"`
	ActiveWidgetID string   `json:"active_widget_id"`
}
