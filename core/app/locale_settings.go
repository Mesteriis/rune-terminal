package app

import (
	"context"
	"fmt"

	"github.com/Mesteriis/rune-terminal/core/locale"
)

func (r *Runtime) LocaleSettings(ctx context.Context) (locale.Settings, error) {
	if r.LocalePreferences == nil {
		return locale.Settings{}, fmt.Errorf("locale settings store is not configured")
	}

	return r.LocalePreferences.Snapshot(ctx)
}

func (r *Runtime) UpdateLocaleSettings(ctx context.Context, settings locale.Settings) (locale.Settings, error) {
	if r.LocalePreferences == nil {
		return locale.Settings{}, fmt.Errorf("locale settings store is not configured")
	}

	return r.LocalePreferences.Update(ctx, settings)
}
