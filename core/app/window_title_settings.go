package app

import (
	"context"
	"fmt"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/windowtitle"
)

func (r *Runtime) WindowTitleSettings(ctx context.Context) (windowtitle.Settings, error) {
	if r.WindowTitlePreferences == nil {
		return windowtitle.Settings{}, fmt.Errorf("window title settings store is not configured")
	}

	return r.WindowTitlePreferences.Snapshot(ctx)
}

func (r *Runtime) UpdateWindowTitleSettings(
	ctx context.Context,
	settings windowtitle.Settings,
) (windowtitle.Settings, error) {
	if r.WindowTitlePreferences == nil {
		return windowtitle.Settings{}, fmt.Errorf("window title settings store is not configured")
	}

	return r.WindowTitlePreferences.Update(ctx, settings)
}

func (r *Runtime) AutoWindowTitleLabel() string {
	snapshot := r.Workspace.Snapshot()
	activeTitle := strings.TrimSpace(snapshot.Name)
	if activeTitle == "" {
		activeTitle = "Workspace"
	}
	return activeTitle
}

func (r *Runtime) ComposedWindowTitle(ctx context.Context) (string, error) {
	settings, err := r.WindowTitleSettings(ctx)
	if err != nil {
		return "", err
	}
	return windowtitle.ComposeTitle(settings, r.AutoWindowTitleLabel()), nil
}
