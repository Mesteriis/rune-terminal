package connections

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

const tmuxListSessionsScript = "tmux list-sessions -F '#{session_name}\t#{?session_attached,1,0}\t#{session_windows}'"

type TmuxProbe interface {
	ListSessions(context.Context, Connection) ([]TmuxSession, error)
}

type defaultTmuxProbe struct{}

func DefaultTmuxProbe() TmuxProbe {
	return defaultTmuxProbe{}
}

func (defaultTmuxProbe) ListSessions(ctx context.Context, connection Connection) ([]TmuxSession, error) {
	if connection.Kind != KindSSH || connection.SSH == nil {
		return nil, fmt.Errorf("%w: tmux sessions require an ssh profile", ErrInvalidConnection)
	}

	sshPath, args, err := BuildSSHCommandArgs(connection.SSH, "sh", "-lc", tmuxListSessionsScript)
	if err != nil {
		return nil, err
	}

	probeCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(probeCtx, sshPath, args...)
	cmd.Env = append(cmd.Environ(), "TERM=dumb")
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		combined := strings.TrimSpace(strings.Join([]string{stdout.String(), stderr.String(), err.Error()}, "\n"))
		lower := strings.ToLower(combined)
		if strings.Contains(lower, "no server running") ||
			strings.Contains(lower, "failed to connect to server") {
			return []TmuxSession{}, nil
		}
		return nil, errors.New(strings.TrimSpace(combined))
	}

	return parseTmuxSessionsOutput(stdout.String()), nil
}

func parseTmuxSessionsOutput(raw string) []TmuxSession {
	lines := strings.Split(strings.TrimSpace(raw), "\n")
	sessions := make([]TmuxSession, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Split(line, "\t")
		session := TmuxSession{Name: strings.TrimSpace(parts[0])}
		if len(parts) > 1 {
			session.Attached = strings.TrimSpace(parts[1]) == "1"
		}
		if len(parts) > 2 {
			if windows, err := strconv.Atoi(strings.TrimSpace(parts[2])); err == nil && windows > 0 {
				session.WindowCount = windows
			}
		}
		if session.Name == "" {
			continue
		}
		sessions = append(sessions, session)
	}
	return sessions
}
