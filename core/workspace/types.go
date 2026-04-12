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

type Snapshot struct {
	ID             string   `json:"id"`
	Name           string   `json:"name"`
	Widgets        []Widget `json:"widgets"`
	ActiveWidgetID string   `json:"active_widget_id"`
}
