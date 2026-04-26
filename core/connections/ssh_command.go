package connections

import (
	"errors"
	"os/exec"
	"strconv"
	"strings"
)

func BuildSSHCommandArgs(config *SSHConfig, remoteArgs ...string) (string, []string, error) {
	if config == nil {
		return "", nil, errors.New("ssh connection is missing config")
	}
	if strings.TrimSpace(config.Host) == "" {
		return "", nil, errors.New("ssh connection host is required")
	}

	sshPath, err := exec.LookPath("ssh")
	if err != nil {
		return "", nil, errors.New("ssh binary is not available on this machine")
	}

	args := make([]string, 0, 12+len(remoteArgs))
	args = append(
		args,
		"-o", "BatchMode=yes",
		"-o", "ConnectTimeout=5",
		"-o", "StrictHostKeyChecking=accept-new",
	)
	if config.Port > 0 {
		args = append(args, "-p", strconv.Itoa(config.Port))
	}
	if strings.TrimSpace(config.IdentityFile) != "" {
		args = append(args, "-i", config.IdentityFile)
	}

	target := strings.TrimSpace(config.Host)
	if strings.TrimSpace(config.User) != "" {
		target = strings.TrimSpace(config.User) + "@" + target
	}
	args = append(args, target)
	args = append(args, remoteArgs...)
	return sshPath, args, nil
}
