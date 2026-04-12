package workspace

import (
	"errors"
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
	return widget, nil
}

func (s *Service) findWidgetLocked(widgetID string) (Widget, error) {
	for _, widget := range s.snapshot.Widgets {
		if widget.ID == widgetID {
			return widget, nil
		}
	}
	return Widget{}, errors.New("widget not found")
}

func cloneSnapshot(snapshot Snapshot) Snapshot {
	snapshot.Widgets = slices.Clone(snapshot.Widgets)
	return snapshot
}
