package workspace

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"slices"
	"strings"
)

const snapshotSchemaVersion = 2

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
		seenWidgetIDs := make(map[string]struct{}, len(tab.WidgetIDs))
		for _, widgetID := range tab.WidgetIDs {
			widgetID = strings.TrimSpace(widgetID)
			if widgetID == "" {
				continue
			}
			if _, seen := seenWidgetIDs[widgetID]; seen {
				continue
			}
			if _, ok := widgetsByID[widgetID]; !ok {
				continue
			}
			seenWidgetIDs[widgetID] = struct{}{}
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
	addedWidgetIDs := make(map[string]struct{}, len(referencedWidgets))
	for _, widget := range candidate.Widgets {
		if _, ok := referencedWidgets[widget.ID]; !ok {
			continue
		}
		if _, exists := addedWidgetIDs[widget.ID]; exists {
			continue
		}
		addedWidgetIDs[widget.ID] = struct{}{}
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

	for i := range normalized.Tabs {
		preferredWidgetID := normalized.Tabs[i].WidgetIDs[0]
		if normalized.Tabs[i].ID == activeTabID {
			candidateActiveWidgetID := strings.TrimSpace(candidate.ActiveWidgetID)
			if candidateActiveWidgetID != "" && slices.Contains(normalized.Tabs[i].WidgetIDs, candidateActiveWidgetID) {
				preferredWidgetID = candidateActiveWidgetID
			}
		}
		normalized.Tabs[i].WindowLayout = normalizeWindowLayout(
			normalized.Tabs[i].WindowLayout,
			normalized.Tabs[i].WidgetIDs,
			preferredWidgetID,
		)
	}

	activeWidgetID := strings.TrimSpace(candidate.ActiveWidgetID)
	if activeWidgetID == "" || !widgetExists(normalized.Widgets, activeWidgetID) || !widgetInTab(normalized.Tabs, activeTabID, activeWidgetID) {
		activeWidgetID = normalized.Tabs[0].WidgetIDs[0]
		for _, tab := range normalized.Tabs {
			if tab.ID == activeTabID && len(tab.WidgetIDs) > 0 {
				activeWidgetID = firstWindowLeafID(tab.WindowLayout)
				if activeWidgetID == "" || !slices.Contains(tab.WidgetIDs, activeWidgetID) {
					activeWidgetID = tab.WidgetIDs[0]
				}
				break
			}
		}
	}
	normalized.ActiveWidgetID = activeWidgetID
	normalized.Layout = normalizeLayout(candidate.Layout, fallback.Layout)
	normalized.Layouts = normalizeLayouts(candidate.Layouts, normalized.Layout, fallback.Layouts, fallback.Layout)
	activeLayoutID := strings.TrimSpace(candidate.ActiveLayoutID)
	if activeLayoutID == "" || !layoutExists(normalized.Layouts, activeLayoutID) {
		activeLayoutID = normalized.Layout.ID
	}
	normalized.ActiveLayoutID = activeLayoutID
	if activeLayout, ok := findLayout(normalized.Layouts, activeLayoutID); ok {
		normalized.Layout = activeLayout
	} else {
		normalized.ActiveLayoutID = normalized.Layout.ID
	}
	return normalized
}

func normalizeLayout(candidate Layout, fallback Layout) Layout {
	normalized := Layout{
		ID:              strings.TrimSpace(candidate.ID),
		Mode:            candidate.Mode,
		ActiveSurfaceID: candidate.ActiveSurfaceID,
	}
	if normalized.ID == "" {
		normalized.ID = fallback.ID
	}
	switch normalized.Mode {
	case LayoutModeSplit, LayoutModeFocus, LayoutModeStacked:
	default:
		normalized.Mode = fallback.Mode
	}

	seenSurfaces := make(map[LayoutSurfaceID]struct{}, len(candidate.Surfaces))
	for _, surface := range candidate.Surfaces {
		if surface.ID == "" {
			continue
		}
		switch surface.Region {
		case LayoutRegionMain, LayoutRegionSidebar, LayoutRegionUtility:
		default:
			continue
		}
		if _, ok := seenSurfaces[surface.ID]; ok {
			continue
		}
		seenSurfaces[surface.ID] = struct{}{}
		normalized.Surfaces = append(normalized.Surfaces, LayoutSurface{
			ID:     surface.ID,
			Region: surface.Region,
		})
	}
	if len(normalized.Surfaces) == 0 {
		normalized.Surfaces = cloneLayout(fallback).Surfaces
	}
	if !layoutSurfaceExists(normalized.Surfaces, LayoutSurfaceTerminal) {
		normalized.Surfaces = append([]LayoutSurface{{
			ID:     LayoutSurfaceTerminal,
			Region: preferredSurfaceRegion(fallback, LayoutSurfaceTerminal, LayoutRegionMain),
		}}, normalized.Surfaces...)
	}
	if normalized.ActiveSurfaceID == "" || !layoutSurfaceExists(normalized.Surfaces, normalized.ActiveSurfaceID) {
		normalized.ActiveSurfaceID = normalized.Surfaces[0].ID
	}
	return normalized
}

func preferredSurfaceRegion(layout Layout, surfaceID LayoutSurfaceID, fallbackRegion LayoutRegion) LayoutRegion {
	for _, surface := range layout.Surfaces {
		if surface.ID == surfaceID {
			return surface.Region
		}
	}
	return fallbackRegion
}

func normalizeLayouts(candidate []Layout, active Layout, fallbackLayouts []Layout, fallback Layout) []Layout {
	if len(candidate) == 0 {
		layouts := []Layout{cloneLayout(active)}
		if len(layouts) == 0 && len(fallbackLayouts) > 0 {
			return cloneLayouts(fallbackLayouts)
		}
		return layouts
	}
	normalized := make([]Layout, 0, len(candidate)+1)
	seen := make(map[string]struct{}, len(candidate)+1)
	fallbackByID := make(map[string]Layout, len(fallbackLayouts))
	for _, layout := range fallbackLayouts {
		fallbackByID[layout.ID] = layout
	}
	for _, layout := range candidate {
		fallbackLayout, ok := fallbackByID[layout.ID]
		if !ok {
			fallbackLayout = fallback
		}
		next := normalizeLayout(layout, fallbackLayout)
		if next.ID == "" {
			continue
		}
		if _, exists := seen[next.ID]; exists {
			continue
		}
		seen[next.ID] = struct{}{}
		normalized = append(normalized, next)
	}
	if _, exists := seen[active.ID]; !exists {
		normalized = append(normalized, cloneLayout(active))
	}
	return normalized
}

func layoutExists(layouts []Layout, layoutID string) bool {
	for _, layout := range layouts {
		if layout.ID == layoutID {
			return true
		}
	}
	return false
}

func findLayout(layouts []Layout, layoutID string) (Layout, bool) {
	for _, layout := range layouts {
		if layout.ID == layoutID {
			return cloneLayout(layout), true
		}
	}
	return Layout{}, false
}

func layoutSurfaceExists(surfaces []LayoutSurface, surfaceID LayoutSurfaceID) bool {
	for _, surface := range surfaces {
		if surface.ID == surfaceID {
			return true
		}
	}
	return false
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
