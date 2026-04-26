package connections

import "strings"

// RemoteProfile is the minimal reusable SSH profile shape for remote terminal launches.
// It intentionally excludes secret material.
type RemoteProfile struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
	Description  string `json:"description,omitempty"`
}

// SaveRemoteProfileInput is the write contract for creating/updating saved remote profiles.
type SaveRemoteProfileInput struct {
	ID           string `json:"id,omitempty"`
	Name         string `json:"name,omitempty"`
	Host         string `json:"host"`
	User         string `json:"user,omitempty"`
	Port         int    `json:"port,omitempty"`
	IdentityFile string `json:"identity_file,omitempty"`
}

type SSHConfigImportSkipped struct {
	Host   string `json:"host,omitempty"`
	Reason string `json:"reason"`
}

type SSHConfigImportResult struct {
	Imported []RemoteProfile          `json:"imported"`
	Skipped  []SSHConfigImportSkipped `json:"skipped,omitempty"`
	Profiles []RemoteProfile          `json:"profiles"`
}

func (input SaveRemoteProfileInput) toSaveSSHInput() SaveSSHInput {
	return SaveSSHInput{
		ID:           input.ID,
		Name:         input.Name,
		Host:         input.Host,
		User:         input.User,
		Port:         input.Port,
		IdentityFile: input.IdentityFile,
	}
}

func (s savedSSH) toRemoteProfile() RemoteProfile {
	return RemoteProfile{
		ID:           s.ID,
		Name:         s.Name,
		Host:         s.Host,
		User:         s.User,
		Port:         s.Port,
		IdentityFile: s.IdentityFile,
		Description:  describeRemoteProfile(s.User, s.Host),
	}
}

func describeRemoteProfile(user string, host string) string {
	host = strings.TrimSpace(host)
	user = strings.TrimSpace(user)
	if user == "" {
		return host
	}
	return user + "@" + host
}
