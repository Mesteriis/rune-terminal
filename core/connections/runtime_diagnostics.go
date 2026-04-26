package connections

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

func normalizeIdentityFileCheckError(path string, err error) string {
	path = strings.TrimSpace(path)
	switch {
	case errors.Is(err, os.ErrNotExist):
		return fmt.Sprintf("Identity file not found: %s.", path)
	case errors.Is(err, os.ErrPermission):
		return fmt.Sprintf("Identity file is not readable: %s.", path)
	default:
		return fmt.Sprintf("Identity file is not accessible: %s.", path)
	}
}

func classifyIdentityFile(path string, info os.FileInfo) string {
	path = strings.TrimSpace(path)
	if strings.HasSuffix(strings.ToLower(path), ".pub") {
		return "Identity file points to a public key. Use the private key file instead."
	}
	if info.IsDir() {
		return fmt.Sprintf("Identity file must point to a file, not a directory: %s.", path)
	}
	if info.Mode().Perm()&0o077 != 0 {
		return fmt.Sprintf("Identity file permissions are too open: %s. Run chmod 600 on the private key.", path)
	}
	return ""
}

func normalizeLaunchError(err error) string {
	if err == nil {
		return ""
	}
	raw := strings.TrimSpace(err.Error())
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	switch {
	case strings.Contains(lower, "tmux") && strings.Contains(lower, "not found"):
		return "Remote host does not have tmux installed for this profile's resume mode."
	case strings.Contains(lower, "host key verification failed"):
		return "SSH host key verification failed. Confirm the host fingerprint or refresh the known_hosts entry."
	case strings.Contains(lower, "permission denied"):
		return "SSH authentication failed. Check the username, key, agent, or passphrase setup."
	case strings.Contains(lower, "enter passphrase"),
		strings.Contains(lower, "incorrect passphrase"),
		strings.Contains(lower, "passphrase"):
		return "SSH key access requires an unlocked passphrase or agent."
	case strings.Contains(lower, "unprotected private key file"),
		strings.Contains(lower, "bad permissions"):
		return "SSH rejected the identity file because its permissions are too open."
	case strings.Contains(lower, "identity file") && strings.Contains(lower, "not accessible"):
		return "SSH could not access the configured identity file."
	case strings.Contains(lower, "connection refused"):
		return "SSH connection was refused by the remote host or port."
	case strings.Contains(lower, "could not resolve hostname"),
		strings.Contains(lower, "name or service not known"),
		strings.Contains(lower, "temporary failure in name resolution"),
		strings.Contains(lower, "nodename nor servname provided"):
		return "SSH could not resolve the remote hostname."
	case strings.Contains(lower, "no route to host"),
		strings.Contains(lower, "network is unreachable"):
		return "SSH could not reach the remote host."
	case strings.Contains(lower, "operation timed out"),
		strings.Contains(lower, "connection timed out"),
		strings.Contains(lower, "timed out"):
		return "SSH connection timed out before the shell became usable."
	default:
		return raw
	}
}

func hasMaterialSSHProfileChange(current savedSSH, next savedSSH) bool {
	return current.Host != next.Host ||
		current.User != next.User ||
		current.Port != next.Port ||
		current.IdentityFile != next.IdentityFile ||
		current.LaunchMode != next.LaunchMode ||
		current.TmuxSession != next.TmuxSession
}

func resetLaunchRuntimeState(runtime *persistedRuntimeState) {
	if runtime == nil {
		return
	}
	runtime.LaunchStatus = LaunchStatusIdle
	runtime.LaunchError = ""
	runtime.LastLaunchedAt = nil
}
