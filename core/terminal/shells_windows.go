//go:build windows

package terminal

import (
	"path/filepath"
	"strings"
)

func AvailableShells() []ShellOption {
	defaultShell := strings.TrimSpace(DefaultShell())
	if defaultShell == "" {
		return []ShellOption{}
	}
	return []ShellOption{{
		Path:    defaultShell,
		Name:    filepath.Base(defaultShell),
		Default: true,
	}}
}

func IsAvailableLocalShell(path string) bool {
	target := strings.TrimSpace(path)
	return target != "" && target == strings.TrimSpace(DefaultShell())
}
