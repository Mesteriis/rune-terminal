package workspace

import (
	"fmt"
	"slices"
	"strings"
	"sync"
)

type Service struct {
	mu       sync.RWMutex
	snapshot Snapshot
}

func NewService(snapshot Snapshot) *Service {
	return &Service{snapshot: snapshot}
}

func BootstrapDefault() Snapshot {
	defaultLayout := DefaultLayout()
	return Snapshot{
		ID:   "ws-local",
		Name: "Local Workspace",
		Tabs: []Tab{
			{
				ID:           "tab-main",
				Title:        "Main Shell",
				Description:  "Primary terminal tab",
				WidgetIDs:    []string{"term-main"},
				WindowLayout: &WindowLayoutNode{Kind: WindowNodeLeaf, WidgetID: "term-main"},
			},
			{
				ID:           "tab-ops",
				Title:        "Ops Shell",
				Description:  "Secondary terminal tab",
				WidgetIDs:    []string{"term-side"},
				WindowLayout: &WindowLayoutNode{Kind: WindowNodeLeaf, WidgetID: "term-side"},
			},
		},
		ActiveTabID: "tab-main",
		Widgets: []Widget{
			{
				ID:           "term-main",
				Kind:         WidgetKindTerminal,
				Title:        "Main Shell",
				Description:  "Primary terminal session",
				TerminalID:   "term-main",
				ConnectionID: "local",
			},
			{
				ID:           "term-side",
				Kind:         WidgetKindTerminal,
				Title:        "Ops Shell",
				Description:  "Secondary terminal session",
				TerminalID:   "term-side",
				ConnectionID: "local",
			},
		},
		ActiveWidgetID: "term-main",
		Layout:         defaultLayout,
		Layouts:        []Layout{cloneLayout(defaultLayout)},
		ActiveLayoutID: defaultLayout.ID,
	}
}

func (s *Service) Snapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneSnapshot(s.snapshot)
}

func (s *Service) ListWidgets() []Widget {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.snapshot.Widgets)
}

func (s *Service) ListTabs() []Tab {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneTabs(s.snapshot.Tabs)
}

func (s *Service) ActiveTab() (Tab, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.findTabLocked(s.snapshot.ActiveTabID)
}

func (s *Service) ActiveWidget() (Widget, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.findWidgetLocked(s.snapshot.ActiveWidgetID)
}

func (s *Service) FocusWidget(widgetID string) (Widget, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	widget, err := s.findWidgetLocked(widgetID)
	if err != nil {
		return Widget{}, err
	}
	s.snapshot.ActiveWidgetID = widgetID
	for _, tab := range s.snapshot.Tabs {
		if slices.Contains(tab.WidgetIDs, widgetID) {
			s.snapshot.ActiveTabID = tab.ID
			break
		}
	}
	return widget, nil
}

func (s *Service) FocusTab(tabID string) (Tab, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tab, err := s.findTabLocked(tabID)
	if err != nil {
		return Tab{}, err
	}
	s.snapshot.ActiveTabID = tabID
	if len(tab.WidgetIDs) > 0 {
		nextWidgetID := firstWindowLeafID(tab.WindowLayout)
		if nextWidgetID == "" || !slices.Contains(tab.WidgetIDs, nextWidgetID) {
			nextWidgetID = tab.WidgetIDs[0]
		}
		s.snapshot.ActiveWidgetID = nextWidgetID
	}
	return tab, nil
}

func (s *Service) AddTerminalTab(tab Tab, widget Widget) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tab.WindowLayout == nil {
		tab.WindowLayout = &WindowLayoutNode{
			Kind:     WindowNodeLeaf,
			WidgetID: widget.ID,
		}
	}
	s.snapshot.Tabs = append(s.snapshot.Tabs, cloneTab(tab))
	s.snapshot.Widgets = append(s.snapshot.Widgets, widget)
	s.snapshot.ActiveTabID = tab.ID
	s.snapshot.ActiveWidgetID = widget.ID
	return cloneSnapshot(s.snapshot)
}

func (s *Service) SplitTabWithWidget(
	tabID string,
	targetWidgetID string,
	widget Widget,
	direction WindowSplitDirection,
) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tabIndex := -1
	for i, tab := range s.snapshot.Tabs {
		if tab.ID == tabID {
			tabIndex = i
			break
		}
	}
	if tabIndex == -1 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
	}
	tab := s.snapshot.Tabs[tabIndex]

	if len(tab.WidgetIDs) == 0 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, targetWidgetID)
	}
	targetWidgetID = strings.TrimSpace(targetWidgetID)
	if targetWidgetID == "" || !slices.Contains(tab.WidgetIDs, targetWidgetID) {
		if s.snapshot.ActiveWidgetID != "" && slices.Contains(tab.WidgetIDs, s.snapshot.ActiveWidgetID) {
			targetWidgetID = s.snapshot.ActiveWidgetID
		} else {
			targetWidgetID = tab.WidgetIDs[len(tab.WidgetIDs)-1]
		}
	}

	layout := normalizeWindowLayout(tab.WindowLayout, tab.WidgetIDs, targetWidgetID)
	nextLayout, changed, err := splitWindowLayoutAtWidget(layout, targetWidgetID, widget.ID, direction)
	if err != nil {
		return Snapshot{}, err
	}
	if !changed {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, targetWidgetID)
	}

	tab.WidgetIDs = append(tab.WidgetIDs, widget.ID)
	tab.WindowLayout = nextLayout
	s.snapshot.Tabs[tabIndex] = tab
	s.snapshot.Widgets = append(s.snapshot.Widgets, widget)
	s.snapshot.ActiveTabID = tabID
	s.snapshot.ActiveWidgetID = widget.ID
	return cloneSnapshot(s.snapshot), nil
}

func (s *Service) MoveWidgetBySplit(
	tabID string,
	widgetID string,
	targetWidgetID string,
	direction WindowMoveDirection,
) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tabIndex := -1
	for i, tab := range s.snapshot.Tabs {
		if tab.ID == tabID {
			tabIndex = i
			break
		}
	}
	if tabIndex == -1 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
	}
	tab := s.snapshot.Tabs[tabIndex]
	widgetID = strings.TrimSpace(widgetID)
	targetWidgetID = strings.TrimSpace(targetWidgetID)
	if widgetID == "" || targetWidgetID == "" {
		return Snapshot{}, fmt.Errorf("%w: widget and target widget are required", ErrInvalidTabMove)
	}
	if widgetID == targetWidgetID {
		return Snapshot{}, ErrInvalidTabMove
	}
	if !slices.Contains(tab.WidgetIDs, widgetID) {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	if !slices.Contains(tab.WidgetIDs, targetWidgetID) {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, targetWidgetID)
	}

	layout := normalizeWindowLayout(tab.WindowLayout, tab.WidgetIDs, s.snapshot.ActiveWidgetID)
	nextLayout, changed, err := moveWindowLayoutByDirection(layout, widgetID, targetWidgetID, direction)
	if err != nil {
		return Snapshot{}, err
	}
	if !changed {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, targetWidgetID)
	}

	tab.WindowLayout = nextLayout
	s.snapshot.Tabs[tabIndex] = tab
	s.snapshot.ActiveTabID = tabID
	s.snapshot.ActiveWidgetID = widgetID
	return cloneSnapshot(s.snapshot), nil
}

func (s *Service) UpdateLayout(layout Layout) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	nextLayout := normalizeLayout(layout, s.snapshot.Layout)
	s.applyLayoutLocked(nextLayout)
	return cloneSnapshot(s.snapshot)
}

func (s *Service) SaveLayout(layoutID string) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()

	layoutID = strings.TrimSpace(layoutID)
	if layoutID == "" {
		layoutID = s.nextLayoutIDLocked()
	}
	nextLayout := cloneLayout(s.snapshot.Layout)
	nextLayout.ID = layoutID
	s.applyLayoutLocked(nextLayout)
	return cloneSnapshot(s.snapshot)
}

func (s *Service) SwitchLayout(layoutID string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	layoutID = strings.TrimSpace(layoutID)
	for _, layout := range s.snapshot.Layouts {
		if layout.ID == layoutID {
			nextLayout := normalizeLayout(layout, s.snapshot.Layout)
			nextLayout.ID = layout.ID
			s.applyLayoutLocked(nextLayout)
			return cloneSnapshot(s.snapshot), nil
		}
	}
	return Snapshot{}, fmt.Errorf("%w: %s", ErrLayoutNotFound, layoutID)
}

func (s *Service) CloseTab(tabID string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if len(s.snapshot.Tabs) <= 1 {
		return Snapshot{}, ErrCannotCloseLastTab
	}

	tabIndex := -1
	var tab Tab
	for i, existing := range s.snapshot.Tabs {
		if existing.ID == tabID {
			tabIndex = i
			tab = existing
			break
		}
	}
	if tabIndex == -1 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
	}

	s.snapshot.Tabs = append(s.snapshot.Tabs[:tabIndex], s.snapshot.Tabs[tabIndex+1:]...)
	if len(tab.WidgetIDs) > 0 {
		filtered := s.snapshot.Widgets[:0]
		for _, widget := range s.snapshot.Widgets {
			if !slices.Contains(tab.WidgetIDs, widget.ID) {
				filtered = append(filtered, widget)
			}
		}
		s.snapshot.Widgets = filtered
	}

	if s.snapshot.ActiveTabID == tabID {
		nextIndex := min(tabIndex, len(s.snapshot.Tabs)-1)
		nextTab := s.snapshot.Tabs[nextIndex]
		s.snapshot.ActiveTabID = nextTab.ID
		if len(nextTab.WidgetIDs) > 0 {
			s.snapshot.ActiveWidgetID = nextTab.WidgetIDs[0]
		}
	} else if slices.Contains(tab.WidgetIDs, s.snapshot.ActiveWidgetID) {
		activeTab, err := s.findTabLocked(s.snapshot.ActiveTabID)
		if err == nil && len(activeTab.WidgetIDs) > 0 {
			s.snapshot.ActiveWidgetID = activeTab.WidgetIDs[0]
		}
	}

	return cloneSnapshot(s.snapshot), nil
}

func (s *Service) RenameTab(tabID string, title string) (Tab, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	title = strings.TrimSpace(title)
	if title == "" {
		return Tab{}, ErrInvalidTabName
	}
	for i, tab := range s.snapshot.Tabs {
		if tab.ID == tabID {
			s.snapshot.Tabs[i].Title = title
			return cloneTab(s.snapshot.Tabs[i]), nil
		}
	}
	return Tab{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
}

func (s *Service) SetTabPinned(tabID string, pinned bool) (Tab, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, tab := range s.snapshot.Tabs {
		if tab.ID != tabID {
			continue
		}
		s.snapshot.Tabs[i].Pinned = pinned
		updated := cloneTab(s.snapshot.Tabs[i])
		return updated, nil
	}
	return Tab{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
}

func (s *Service) MoveTab(tabID string, beforeTabID string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if tabID == beforeTabID {
		return cloneSnapshot(s.snapshot), nil
	}

	fromIndex := -1
	toIndex := -1
	for i, tab := range s.snapshot.Tabs {
		switch tab.ID {
		case tabID:
			fromIndex = i
		case beforeTabID:
			toIndex = i
		}
	}
	if fromIndex == -1 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
	}
	if toIndex == -1 {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrTabNotFound, beforeTabID)
	}
	if s.snapshot.Tabs[fromIndex].Pinned != s.snapshot.Tabs[toIndex].Pinned {
		return Snapshot{}, ErrInvalidTabMove
	}

	tab := s.snapshot.Tabs[fromIndex]
	s.snapshot.Tabs = append(s.snapshot.Tabs[:fromIndex], s.snapshot.Tabs[fromIndex+1:]...)
	if fromIndex < toIndex {
		toIndex--
	}
	s.snapshot.Tabs = append(s.snapshot.Tabs[:toIndex], append([]Tab{tab}, s.snapshot.Tabs[toIndex:]...)...)
	return cloneSnapshot(s.snapshot), nil
}

func (s *Service) findWidgetLocked(widgetID string) (Widget, error) {
	for _, widget := range s.snapshot.Widgets {
		if widget.ID == widgetID {
			return widget, nil
		}
	}
	return Widget{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
}

func (s *Service) findTabLocked(tabID string) (Tab, error) {
	for _, tab := range s.snapshot.Tabs {
		if tab.ID == tabID {
			return cloneTab(tab), nil
		}
	}
	return Tab{}, fmt.Errorf("%w: %s", ErrTabNotFound, tabID)
}

func cloneSnapshot(snapshot Snapshot) Snapshot {
	snapshot.Tabs = cloneTabs(snapshot.Tabs)
	snapshot.Widgets = slices.Clone(snapshot.Widgets)
	snapshot.Layout = cloneLayout(snapshot.Layout)
	snapshot.Layouts = cloneLayouts(snapshot.Layouts)
	return snapshot
}

func cloneLayouts(layouts []Layout) []Layout {
	cloned := slices.Clone(layouts)
	for i := range cloned {
		cloned[i] = cloneLayout(cloned[i])
	}
	return cloned
}

func cloneTabs(tabs []Tab) []Tab {
	cloned := slices.Clone(tabs)
	for i := range cloned {
		cloned[i] = cloneTab(cloned[i])
	}
	return cloned
}

func cloneTab(tab Tab) Tab {
	tab.WidgetIDs = slices.Clone(tab.WidgetIDs)
	tab.WindowLayout = cloneWindowLayout(tab.WindowLayout)
	return tab
}

func (s *Service) applyLayoutLocked(layout Layout) {
	s.snapshot.Layout = cloneLayout(layout)
	s.snapshot.ActiveLayoutID = layout.ID
	replaced := false
	for i := range s.snapshot.Layouts {
		if s.snapshot.Layouts[i].ID == layout.ID {
			s.snapshot.Layouts[i] = cloneLayout(layout)
			replaced = true
			break
		}
	}
	if !replaced {
		s.snapshot.Layouts = append(s.snapshot.Layouts, cloneLayout(layout))
	}
}

func (s *Service) nextLayoutIDLocked() string {
	base := "layout"
	for index := 1; ; index++ {
		candidate := fmt.Sprintf("%s-%d", base, index)
		exists := false
		for _, layout := range s.snapshot.Layouts {
			if layout.ID == candidate {
				exists = true
				break
			}
		}
		if !exists {
			return candidate
		}
	}
}
