package connections

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

type Checker interface {
	Check(context.Context, Connection) CheckResult
}

type defaultChecker struct{}

func DefaultChecker() Checker {
	return defaultChecker{}
}

func (defaultChecker) Check(ctx context.Context, connection Connection) CheckResult {
	now := time.Now().UTC()
	if connection.Kind == KindLocal {
		return CheckResult{
			Status:    CheckStatusPassed,
			CheckedAt: now,
		}
	}
	if connection.SSH == nil {
		return CheckResult{
			Status:    CheckStatusFailed,
			Error:     "ssh configuration is missing",
			CheckedAt: now,
		}
	}
	if strings.TrimSpace(connection.SSH.Host) == "" {
		return CheckResult{
			Status:    CheckStatusFailed,
			Error:     "ssh host is required",
			CheckedAt: now,
		}
	}
	if _, err := exec.LookPath("ssh"); err != nil {
		return CheckResult{
			Status:    CheckStatusFailed,
			Error:     "ssh binary is not available on this machine",
			CheckedAt: now,
		}
	}
	if connection.SSH.IdentityFile != "" {
		info, err := os.Stat(connection.SSH.IdentityFile)
		if err != nil {
			return CheckResult{
				Status:    CheckStatusFailed,
				Error:     normalizeIdentityFileCheckError(connection.SSH.IdentityFile, err),
				CheckedAt: now,
			}
		}
		if detail := classifyIdentityFile(connection.SSH.IdentityFile, info); detail != "" {
			return CheckResult{
				Status:    CheckStatusFailed,
				Error:     detail,
				CheckedAt: now,
			}
		}
	}
	return CheckResult{
		Status:    CheckStatusPassed,
		CheckedAt: now,
	}
}

func normalizeIdentityFile(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "~/") {
		if home, err := os.UserHomeDir(); err == nil {
			path = filepath.Join(home, path[2:])
		}
	}
	if abs, err := filepath.Abs(path); err == nil {
		path = abs
	}
	return filepath.Clean(path)
}
