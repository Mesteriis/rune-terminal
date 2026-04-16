package workspace

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

const snapshotSchemaVersion = 1

type persistedSnapshot struct {
	Version   int      `json:"version"`
	Workspace Snapshot `json:"workspace"`
}

func LoadSnapshot(path string, fallback Snapshot) (Snapshot, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return cloneSnapshot(fallback), nil
		}
		return Snapshot{}, err
	}
	if len(data) == 0 {
		return cloneSnapshot(fallback), nil
	}

	var persisted persistedSnapshot
	if err := json.Unmarshal(data, &persisted); err == nil {
		return normalizeSnapshot(persisted.Workspace, fallback), nil
	}

	// Backward-compatible fallback for raw snapshot payloads.
	var raw Snapshot
	if err := json.Unmarshal(data, &raw); err != nil {
		return Snapshot{}, err
	}
	return normalizeSnapshot(raw, fallback), nil
}

func SaveSnapshot(path string, snapshot Snapshot) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(persistedSnapshot{
		Version:   snapshotSchemaVersion,
		Workspace: snapshot,
	}, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, payload, 0o600)
}

func normalizeSnapshot(candidate Snapshot, fallback Snapshot) Snapshot {
	normalized := Snapshot{
		ID:   strings.TrimSpace(candidate.ID),
		Name: strings.TrimSpace(candidate.Name),
	}
	if normalized.ID == "" {
		normalized.ID = fallback.ID
	}
	if normalized.Name == "" {
		normalized.Name = fallback.Name
	}

	widgetsByID := make(map[string]Widget, len(candidate.Widgets))
	for _, widget := range candidate.Widgets {
		if strings.TrimSpace(widget.ID) == "" {
			continue
		}
		widget.ID = strings.TrimSpace(widget.ID)
		widgetsByID[widget.ID] = widget
	}

	referencedWidgets := make(map[string]struct{}, len(candidate.Widgets))
	for _, tab := range candidate.Tabs {
		if strings.TrimSpace(tab.ID) == "" {
			continue
		}
		tab.ID = strings.TrimSpace(tab.ID)
		filteredWidgetIDs := make([]string, 0, len(tab.WidgetIDs))
		for _, widgetID := range tab.WidgetIDs {
			widgetID = strings.TrimSpace(widgetID)
			if widgetID == "" {
				continue
			}
			if _, ok := widgetsByID[widgetID]; !ok {
				continue
			}
			filteredWidgetIDs = append(filteredWidgetIDs, widgetID)
			referencedWidgets[widgetID] = struct{}{}
		}
		if len(filteredWidgetIDs) == 0 {
			continue
		}
		tab.WidgetIDs = filteredWidgetIDs
		normalized.Tabs = append(normalized.Tabs, tab)
	}

	if len(normalized.Tabs) == 0 {
		return cloneSnapshot(fallback)
	}

	normalized.Widgets = make([]Widget, 0, len(referencedWidgets))
	for _, widget := range candidate.Widgets {
		if _, ok := referencedWidgets[widget.ID]; !ok {
			continue
		}
		normalized.Widgets = append(normalized.Widgets, widget)
	}
	if len(normalized.Widgets) == 0 {
		return cloneSnapshot(fallback)
	}

	activeTabID := strings.TrimSpace(candidate.ActiveTabID)
	if activeTabID == "" || !tabExists(normalized.Tabs, activeTabID) {
		activeTabID = normalized.Tabs[0].ID
	}
	normalized.ActiveTabID = activeTabID

	activeWidgetID := strings.TrimSpace(candidate.ActiveWidgetID)
	if activeWidgetID == "" || !widgetExists(normalized.Widgets, activeWidgetID) || !widgetInTab(normalized.Tabs, activeTabID, activeWidgetID) {
		activeWidgetID = normalized.Tabs[0].WidgetIDs[0]
		for _, tab := range normalized.Tabs {
			if tab.ID == activeTabID && len(tab.WidgetIDs) > 0 {
				activeWidgetID = tab.WidgetIDs[0]
				break
			}
		}
	}
	normalized.ActiveWidgetID = activeWidgetID
	return normalized
}

func tabExists(tabs []Tab, tabID string) bool {
	for _, tab := range tabs {
		if tab.ID == tabID {
			return true
		}
	}
	return false
}

func widgetExists(widgets []Widget, widgetID string) bool {
	for _, widget := range widgets {
		if widget.ID == widgetID {
			return true
		}
	}
	return false
}

func widgetInTab(tabs []Tab, tabID string, widgetID string) bool {
	for _, tab := range tabs {
		if tab.ID != tabID {
			continue
		}
		for _, candidate := range tab.WidgetIDs {
			if candidate == widgetID {
				return true
			}
		}
	}
	return false
}
