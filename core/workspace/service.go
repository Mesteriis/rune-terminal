package workspace

import (
	"fmt"
	"slices"
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
	return Snapshot{
		ID:   "ws-local",
		Name: "Local Workspace",
		Tabs: []Tab{
			{
				ID:          "tab-main",
				Title:       "Main Shell",
				Description: "Primary terminal tab",
				WidgetIDs:   []string{"term-main"},
			},
			{
				ID:          "tab-ops",
				Title:       "Ops Shell",
				Description: "Secondary terminal tab",
				WidgetIDs:   []string{"term-side"},
			},
		},
		ActiveTabID: "tab-main",
		Widgets: []Widget{
			{
				ID:          "term-main",
				Kind:        WidgetKindTerminal,
				Title:       "Main Shell",
				Description: "Primary terminal session",
				TerminalID:  "term-main",
			},
			{
				ID:          "term-side",
				Kind:        WidgetKindTerminal,
				Title:       "Ops Shell",
				Description: "Secondary terminal session",
				TerminalID:  "term-side",
			},
		},
		ActiveWidgetID: "term-main",
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
		s.snapshot.ActiveWidgetID = tab.WidgetIDs[0]
	}
	return tab, nil
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
	return snapshot
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
	return tab
}
