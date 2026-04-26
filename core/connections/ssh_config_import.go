package connections

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"sort"
	"strconv"
	"strings"
)

type sshConfigProfileCandidate struct {
	Alias        string
	Host         string
	User         string
	Port         int
	IdentityFile string
}

type sshConfigEntryKind string

const (
	sshConfigEntrySelector sshConfigEntryKind = "selector"
	sshConfigEntrySetting  sshConfigEntryKind = "setting"
)

type sshConfigSelectorKind string

const (
	sshConfigSelectorGlobal sshConfigSelectorKind = "global"
	sshConfigSelectorHost   sshConfigSelectorKind = "host"
	sshConfigSelectorMatch  sshConfigSelectorKind = "match"
)

type sshConfigEntry struct {
	kind           sshConfigEntryKind
	selectorKind   sshConfigSelectorKind
	hostPatterns   []string
	matchCondition sshConfigMatchCondition
	key            string
	value          string
}

type sshConfigMatchCondition struct {
	all                  bool
	hostPatterns         []string
	originalHostPatterns []string
	supported            bool
}

func (s *Service) ImportSSHConfig(path string) (SSHConfigImportResult, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return SSHConfigImportResult{}, fmt.Errorf("%w: ssh config path is required", ErrInvalidConnection)
	}

	entries, skipped, err := loadSSHConfigEntries(path, make(map[string]struct{}))
	if err != nil {
		if os.IsNotExist(err) {
			return SSHConfigImportResult{}, fmt.Errorf("%w: ssh config not found", ErrInvalidConnection)
		}
		return SSHConfigImportResult{}, err
	}

	candidates, candidateSkipped := collectSSHConfigCandidates(entries)
	skipped = append(skipped, candidateSkipped...)

	s.mu.Lock()
	defer s.mu.Unlock()

	imported := make([]RemoteProfile, 0, len(candidates))
	for _, candidate := range candidates {
		input := SaveSSHInput{
			ID:           s.findSSHIDByNameLocked(candidate.Alias),
			Name:         candidate.Alias,
			Host:         candidate.Host,
			User:         candidate.User,
			Port:         candidate.Port,
			IdentityFile: candidate.IdentityFile,
		}
		connection, err := s.saveSSHLocked(input)
		if err != nil {
			skipped = append(skipped, SSHConfigImportSkipped{
				Host:   candidate.Alias,
				Reason: err.Error(),
			})
			continue
		}
		if connection.SSH == nil {
			continue
		}
		imported = append(imported, RemoteProfile{
			ID:           connection.ID,
			Name:         connection.Name,
			Host:         connection.SSH.Host,
			User:         connection.SSH.User,
			Port:         connection.SSH.Port,
			IdentityFile: connection.SSH.IdentityFile,
			Description:  describeRemoteProfile(connection.SSH.User, connection.SSH.Host),
		})
	}

	if len(imported) > 0 {
		if err := s.persistLocked(); err != nil {
			return SSHConfigImportResult{}, err
		}
	}

	return SSHConfigImportResult{
		Imported: imported,
		Skipped:  skipped,
		Profiles: s.listRemoteProfilesLocked(),
	}, nil
}

func (s *Service) findSSHIDByNameLocked(name string) string {
	name = strings.TrimSpace(name)
	for _, connection := range s.state.SSHConnections {
		if connection.Name == name {
			return connection.ID
		}
	}
	return ""
}

func loadSSHConfigEntries(path string, seen map[string]struct{}) ([]sshConfigEntry, []SSHConfigImportSkipped, error) {
	resolvedPath, err := filepath.Abs(strings.TrimSpace(path))
	if err != nil {
		resolvedPath = strings.TrimSpace(path)
	}
	if _, ok := seen[resolvedPath]; ok {
		return nil, nil, nil
	}
	seen[resolvedPath] = struct{}{}

	data, err := os.ReadFile(resolvedPath)
	if err != nil {
		return nil, nil, err
	}

	entries := make([]sshConfigEntry, 0)
	skipped := make([]SSHConfigImportSkipped, 0)

	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		fields := sshConfigFields(scanner.Text())
		if len(fields) == 0 {
			continue
		}

		key := strings.ToLower(fields[0])
		values := slices.Clone(fields[1:])
		if len(values) == 0 {
			continue
		}

		switch key {
		case "host":
			entries = append(entries, sshConfigEntry{
				kind:         sshConfigEntrySelector,
				selectorKind: sshConfigSelectorHost,
				hostPatterns: values,
			})
		case "match":
			condition := parseSSHConfigMatchCondition(values)
			entries = append(entries, sshConfigEntry{
				kind:           sshConfigEntrySelector,
				selectorKind:   sshConfigSelectorMatch,
				matchCondition: condition,
			})
			if !condition.supported {
				skipped = append(skipped, SSHConfigImportSkipped{Reason: "unsupported_match_criteria"})
			}
		case "include":
			for _, includePattern := range values {
				matches, includeErr := resolveSSHConfigIncludePaths(resolvedPath, includePattern)
				if includeErr != nil {
					skipped = append(skipped, SSHConfigImportSkipped{
						Reason: "include_error:" + includeErr.Error(),
					})
					continue
				}
				for _, includePath := range matches {
					nestedEntries, nestedSkipped, nestedErr := loadSSHConfigEntries(includePath, seen)
					if nestedErr != nil {
						skipped = append(skipped, SSHConfigImportSkipped{
							Host:   includePath,
							Reason: nestedErr.Error(),
						})
						continue
					}
					entries = append(entries, nestedEntries...)
					skipped = append(skipped, nestedSkipped...)
				}
			}
		default:
			entries = append(entries, sshConfigEntry{
				kind:  sshConfigEntrySetting,
				key:   key,
				value: strings.TrimSpace(strings.Join(values, " ")),
			})
		}
	}

	if err := scanner.Err(); err != nil {
		skipped = append(skipped, SSHConfigImportSkipped{Reason: err.Error()})
	}
	return entries, skipped, nil
}

func collectSSHConfigCandidates(entries []sshConfigEntry) ([]sshConfigProfileCandidate, []SSHConfigImportSkipped) {
	candidateAliases := make([]string, 0)
	seenAliases := make(map[string]struct{})
	skipped := make([]SSHConfigImportSkipped, 0)
	for _, entry := range entries {
		if entry.kind != sshConfigEntrySelector || entry.selectorKind != sshConfigSelectorHost {
			continue
		}
		for _, pattern := range entry.hostPatterns {
			pattern = strings.TrimSpace(pattern)
			if pattern == "" {
				continue
			}
			if isUnsupportedSSHConfigHostPattern(pattern) {
				skipped = append(skipped, SSHConfigImportSkipped{
					Host:   pattern,
					Reason: "unsupported_host_pattern",
				})
				continue
			}
			if _, ok := seenAliases[pattern]; ok {
				continue
			}
			seenAliases[pattern] = struct{}{}
			candidateAliases = append(candidateAliases, pattern)
		}
	}

	candidates := make([]sshConfigProfileCandidate, 0, len(candidateAliases))
	for _, alias := range candidateAliases {
		candidate, reason := resolveSSHConfigCandidate(entries, alias)
		if reason != "" {
			skipped = append(skipped, SSHConfigImportSkipped{
				Host:   alias,
				Reason: reason,
			})
			continue
		}
		candidates = append(candidates, candidate)
	}
	return candidates, skipped
}

func resolveSSHConfigCandidate(entries []sshConfigEntry, alias string) (sshConfigProfileCandidate, string) {
	candidate := sshConfigProfileCandidate{Alias: alias}
	selector := sshConfigEntry{
		kind:         sshConfigEntrySelector,
		selectorKind: sshConfigSelectorGlobal,
	}

	for _, entry := range entries {
		switch entry.kind {
		case sshConfigEntrySelector:
			selector = entry
		case sshConfigEntrySetting:
			if !sshConfigSelectorApplies(selector, alias, candidate.Host) {
				continue
			}
			switch entry.key {
			case "hostname":
				if candidate.Host == "" {
					candidate.Host = entry.value
				}
			case "user":
				if candidate.User == "" {
					candidate.User = entry.value
				}
			case "port":
				if candidate.Port != 0 {
					continue
				}
				parsedPort, err := strconv.Atoi(strings.TrimSpace(entry.value))
				if err != nil || parsedPort < 0 || parsedPort > 65535 {
					return sshConfigProfileCandidate{}, "invalid_port"
				}
				candidate.Port = parsedPort
			case "identityfile":
				if candidate.IdentityFile == "" {
					candidate.IdentityFile = entry.value
				}
			}
		}
	}

	if strings.TrimSpace(candidate.Host) == "" {
		candidate.Host = alias
	}
	if isUnsupportedSSHConfigHostPattern(candidate.Host) {
		return sshConfigProfileCandidate{}, "unsupported_hostname_pattern"
	}
	candidate.User = strings.TrimSpace(candidate.User)
	candidate.Host = strings.TrimSpace(candidate.Host)
	candidate.IdentityFile = strings.TrimSpace(candidate.IdentityFile)
	return candidate, ""
}

func sshConfigSelectorApplies(selector sshConfigEntry, alias string, resolvedHost string) bool {
	switch selector.selectorKind {
	case sshConfigSelectorGlobal:
		return true
	case sshConfigSelectorHost:
		return matchesSSHConfigPatterns(selector.hostPatterns, alias)
	case sshConfigSelectorMatch:
		return selector.matchCondition.matches(alias, resolvedHost)
	default:
		return false
	}
}

func parseSSHConfigMatchCondition(values []string) sshConfigMatchCondition {
	condition := sshConfigMatchCondition{supported: true}
	if len(values) == 1 && strings.EqualFold(strings.TrimSpace(values[0]), "all") {
		condition.all = true
		return condition
	}

	knownKeywords := map[string]struct{}{
		"all":          {},
		"canonical":    {},
		"exec":         {},
		"final":        {},
		"host":         {},
		"localnetwork": {},
		"localuser":    {},
		"originalhost": {},
		"tagged":       {},
		"user":         {},
		"version":      {},
	}

	currentKeyword := ""
	for _, rawValue := range values {
		value := strings.ToLower(strings.TrimSpace(rawValue))
		if value == "" {
			continue
		}
		if _, ok := knownKeywords[value]; ok {
			currentKeyword = value
			if value == "all" {
				condition.all = true
			}
			if value != "all" && value != "host" && value != "originalhost" {
				condition.supported = false
			}
			continue
		}
		switch currentKeyword {
		case "host":
			condition.hostPatterns = append(condition.hostPatterns, rawValue)
		case "originalhost":
			condition.originalHostPatterns = append(condition.originalHostPatterns, rawValue)
		default:
			condition.supported = false
		}
	}
	return condition
}

func (condition sshConfigMatchCondition) matches(alias string, resolvedHost string) bool {
	if !condition.supported {
		return false
	}
	if condition.all {
		return true
	}
	if len(condition.hostPatterns) > 0 {
		hostValue := strings.TrimSpace(resolvedHost)
		if hostValue == "" {
			hostValue = alias
		}
		if !matchesSSHConfigPatterns(condition.hostPatterns, hostValue) {
			return false
		}
	}
	if len(condition.originalHostPatterns) > 0 && !matchesSSHConfigPatterns(condition.originalHostPatterns, alias) {
		return false
	}
	return len(condition.hostPatterns) > 0 || len(condition.originalHostPatterns) > 0
}

func matchesSSHConfigPatterns(patterns []string, candidate string) bool {
	candidate = strings.TrimSpace(candidate)
	if candidate == "" {
		return false
	}

	matchedPositive := false
	for _, rawPattern := range patterns {
		pattern := strings.TrimSpace(rawPattern)
		if pattern == "" {
			continue
		}
		negated := strings.HasPrefix(pattern, "!")
		if negated {
			pattern = strings.TrimSpace(pattern[1:])
		}
		ok, err := filepath.Match(pattern, candidate)
		if err != nil || !ok {
			continue
		}
		if negated {
			return false
		}
		matchedPositive = true
	}
	return matchedPositive
}

func resolveSSHConfigIncludePaths(basePath string, includePattern string) ([]string, error) {
	includePattern = strings.TrimSpace(includePattern)
	if includePattern == "" {
		return nil, nil
	}
	if strings.HasPrefix(includePattern, "~/") {
		homeDir, err := os.UserHomeDir()
		if err != nil {
			return nil, err
		}
		includePattern = filepath.Join(homeDir, includePattern[2:])
	} else if !filepath.IsAbs(includePattern) {
		includePattern = filepath.Join(filepath.Dir(basePath), includePattern)
	}

	matches, err := filepath.Glob(includePattern)
	if err != nil {
		return nil, err
	}
	sort.Strings(matches)
	return matches, nil
}

func isUnsupportedSSHConfigHostPattern(value string) bool {
	value = strings.TrimSpace(value)
	return value == "" || strings.ContainsAny(value, "*?!")
}

func sshConfigFields(line string) []string {
	line = stripSSHConfigComment(strings.TrimSpace(line))
	if line == "" {
		return nil
	}

	fields := strings.Fields(line)
	if len(fields) > 0 && strings.Contains(fields[0], "=") {
		parts := strings.SplitN(fields[0], "=", 2)
		fields = append([]string{parts[0], parts[1]}, fields[1:]...)
	}
	for index, field := range fields {
		fields[index] = strings.Trim(field, `"'`)
	}
	return fields
}

func stripSSHConfigComment(line string) string {
	var quote rune
	for index, char := range line {
		if quote != 0 {
			if char == quote {
				quote = 0
			}
			continue
		}
		if char == '\'' || char == '"' {
			quote = char
			continue
		}
		if char == '#' {
			return strings.TrimSpace(line[:index])
		}
	}
	return strings.TrimSpace(line)
}
