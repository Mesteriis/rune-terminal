package connections

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
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

type sshConfigHostBlock struct {
	aliases      []string
	hostName     string
	user         string
	port         string
	identityFile string
}

func (s *Service) ImportSSHConfig(path string) (SSHConfigImportResult, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return SSHConfigImportResult{}, fmt.Errorf("%w: ssh config path is required", ErrInvalidConnection)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return SSHConfigImportResult{}, fmt.Errorf("%w: ssh config not found", ErrInvalidConnection)
		}
		return SSHConfigImportResult{}, err
	}

	candidates, skipped := parseSSHConfigProfiles(data)

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

func parseSSHConfigProfiles(data []byte) ([]sshConfigProfileCandidate, []SSHConfigImportSkipped) {
	var candidates []sshConfigProfileCandidate
	var skipped []SSHConfigImportSkipped
	var current *sshConfigHostBlock

	commit := func() {
		if current == nil {
			return
		}

		nextCandidates, nextSkipped := current.toCandidates()
		candidates = append(candidates, nextCandidates...)
		skipped = append(skipped, nextSkipped...)
		current = nil
	}

	scanner := bufio.NewScanner(bytes.NewReader(data))
	for scanner.Scan() {
		fields := sshConfigFields(scanner.Text())
		if len(fields) == 0 {
			continue
		}

		key := strings.ToLower(fields[0])
		values := fields[1:]

		if key == "host" {
			commit()
			current = &sshConfigHostBlock{aliases: values}
			continue
		}
		if key == "match" {
			commit()
			current = nil
			continue
		}

		if current == nil || len(values) == 0 {
			continue
		}

		value := values[0]
		switch key {
		case "hostname":
			current.hostName = value
		case "user":
			current.user = value
		case "port":
			current.port = value
		case "identityfile":
			current.identityFile = value
		}
	}
	commit()

	if err := scanner.Err(); err != nil {
		skipped = append(skipped, SSHConfigImportSkipped{Reason: err.Error()})
	}

	return candidates, skipped
}

func (block sshConfigHostBlock) toCandidates() ([]sshConfigProfileCandidate, []SSHConfigImportSkipped) {
	candidates := make([]sshConfigProfileCandidate, 0, len(block.aliases))
	skipped := make([]SSHConfigImportSkipped, 0)

	port := 0
	if strings.TrimSpace(block.port) != "" {
		parsedPort, err := strconv.Atoi(strings.TrimSpace(block.port))
		if err != nil || parsedPort < 0 || parsedPort > 65535 {
			for _, alias := range block.aliases {
				skipped = append(skipped, SSHConfigImportSkipped{
					Host:   alias,
					Reason: "invalid_port",
				})
			}
			return nil, skipped
		}
		port = parsedPort
	}

	for _, alias := range block.aliases {
		alias = strings.TrimSpace(alias)
		if alias == "" {
			continue
		}
		if isUnsupportedSSHConfigHost(alias) {
			skipped = append(skipped, SSHConfigImportSkipped{
				Host:   alias,
				Reason: "unsupported_host_pattern",
			})
			continue
		}
		host := strings.TrimSpace(block.hostName)
		if host == "" {
			host = alias
		}
		if isUnsupportedSSHConfigHost(host) {
			skipped = append(skipped, SSHConfigImportSkipped{
				Host:   alias,
				Reason: "unsupported_hostname_pattern",
			})
			continue
		}
		candidates = append(candidates, sshConfigProfileCandidate{
			Alias:        alias,
			Host:         host,
			User:         strings.TrimSpace(block.user),
			Port:         port,
			IdentityFile: strings.TrimSpace(block.identityFile),
		})
	}

	return candidates, skipped
}

func isUnsupportedSSHConfigHost(value string) bool {
	return strings.ContainsAny(value, "*?!")
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
