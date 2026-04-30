//go:build darwin || linux

package terminal

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

func AvailableShells() []ShellOption {
	candidates := discoverShellCandidates()
	defaultShell := DefaultShell()
	ordered := make([]string, 0, len(candidates)+1)
	ordered = append(ordered, defaultShell)
	ordered = append(ordered, candidates...)

	seen := make(map[string]struct{}, len(ordered))
	shells := make([]ShellOption, 0, len(ordered))
	for _, candidate := range ordered {
		path := strings.TrimSpace(candidate)
		if path == "" {
			continue
		}
		if _, ok := seen[path]; ok {
			continue
		}
		seen[path] = struct{}{}
		if !isExecutableLocalShell(path) {
			continue
		}
		shells = append(shells, ShellOption{
			Path:    path,
			Name:    filepath.Base(path),
			Default: path == defaultShell,
		})
	}

	if len(shells) == 0 && defaultShell != "" {
		shells = append(shells, ShellOption{
			Path:    defaultShell,
			Name:    filepath.Base(defaultShell),
			Default: true,
		})
	}

	return shells
}

func IsAvailableLocalShell(path string) bool {
	target := strings.TrimSpace(path)
	if target == "" {
		return false
	}
	for _, shell := range AvailableShells() {
		if shell.Path == target {
			return true
		}
	}
	return false
}

func discoverShellCandidates() []string {
	candidates := make([]string, 0, 16)
	file, err := os.Open("/etc/shells")
	if err == nil {
		defer file.Close()
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			candidates = append(candidates, line)
		}
	}

	candidates = append(candidates,
		"/bin/zsh",
		"/bin/bash",
		"/bin/sh",
		"/usr/bin/zsh",
		"/usr/bin/bash",
		"/usr/bin/sh",
		"/opt/homebrew/bin/fish",
		"/usr/local/bin/fish",
		"/usr/bin/fish",
		"/bin/fish",
	)

	return candidates
}

func isExecutableLocalShell(path string) bool {
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		return false
	}
	return info.Mode()&0o111 != 0
}
