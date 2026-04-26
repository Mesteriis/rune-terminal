package connections

import (
	"fmt"
	"regexp"
	"strings"
)

const (
	LaunchModeShell = "shell"
	LaunchModeTmux  = "tmux"
)

var tmuxSessionSanitizer = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)

func normalizeRemoteLaunchPolicy(mode string, tmuxSession string, name string, host string, id string) (string, string, error) {
	normalizedMode := strings.TrimSpace(strings.ToLower(mode))
	switch normalizedMode {
	case "", LaunchModeShell:
		return LaunchModeShell, "", nil
	case LaunchModeTmux:
		normalizedSession := normalizeTmuxSessionName(tmuxSession)
		if normalizedSession == "" {
			normalizedSession = normalizeTmuxSessionName(name)
		}
		if normalizedSession == "" {
			normalizedSession = normalizeTmuxSessionName(host)
		}
		if normalizedSession == "" {
			normalizedSession = normalizeTmuxSessionName(id)
		}
		if normalizedSession == "" {
			return "", "", fmt.Errorf("%w: tmux session name is required", ErrInvalidConnection)
		}
		return LaunchModeTmux, normalizedSession, nil
	default:
		return "", "", fmt.Errorf("%w: invalid remote launch mode", ErrInvalidConnection)
	}
}

func normalizeTmuxSessionName(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	value = tmuxSessionSanitizer.ReplaceAllString(value, "-")
	value = strings.Trim(value, "-.")
	value = strings.TrimSpace(value)
	for strings.Contains(value, "--") {
		value = strings.ReplaceAll(value, "--", "-")
	}
	return value
}
