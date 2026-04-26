package terminal

import (
	"context"
	"fmt"
	"strings"
	"time"
)

const outputSettleWindow = 250 * time.Millisecond

func (s *Service) ObserveLaunch(ctx context.Context, widgetID string, timeout time.Duration) (State, error) {
	s.mu.RLock()
	group, ok := s.groups[widgetID]
	s.mu.RUnlock()
	if !ok {
		return State{}, fmt.Errorf("%w: %s", ErrWidgetNotFound, widgetID)
	}
	sess, err := activeGroupSessionLocked(group)
	if err != nil {
		return State{}, err
	}

	deadline := time.Now().Add(timeout)
	var outputDeadline time.Time
	for {
		state, err := s.GetState(widgetID)
		if err != nil {
			return State{}, err
		}
		switch state.Status {
		case StatusFailed, StatusExited:
			return state, s.launchObservationError(widgetID, state)
		}

		snapshot, snapshotErr := s.Snapshot(widgetID, 0)
		if snapshotErr == nil && len(snapshot.Chunks) > 0 {
			if outputDeadline.IsZero() {
				outputDeadline = time.Now().Add(outputSettleWindow)
			}
			if time.Now().After(outputDeadline) {
				return state, nil
			}
		}
		if time.Now().After(deadline) {
			return state, nil
		}

		select {
		case <-ctx.Done():
			return State{}, ctx.Err()
		case <-sess.exited:
		case <-time.After(75 * time.Millisecond):
		}
	}
}

func (s *Service) launchObservationError(widgetID string, state State) error {
	snapshot, err := s.Snapshot(widgetID, 0)
	summary := ""
	if err == nil {
		summary = summarizeLaunchChunks(snapshot.Chunks)
	}
	base := "terminal launch exited before becoming usable"
	if state.ExitCode != nil {
		base = fmt.Sprintf("%s (exit code %d)", base, *state.ExitCode)
	}
	if summary != "" {
		return fmt.Errorf("%s: %s", base, summary)
	}
	return fmt.Errorf("%s", base)
}

func summarizeLaunchChunks(chunks []OutputChunk) string {
	if len(chunks) == 0 {
		return ""
	}
	parts := make([]string, 0, 3)
	for i := len(chunks) - 1; i >= 0 && len(parts) < 3; i-- {
		text := strings.TrimSpace(chunks[i].Data)
		if text == "" {
			continue
		}
		lines := strings.Split(text, "\n")
		for j := len(lines) - 1; j >= 0 && len(parts) < 3; j-- {
			line := strings.TrimSpace(lines[j])
			if line == "" {
				continue
			}
			parts = append([]string{line}, parts...)
		}
	}
	if len(parts) == 0 {
		return ""
	}
	summary := strings.Join(parts, " | ")
	if len(summary) > 220 {
		summary = summary[:217] + "..."
	}
	return summary
}
