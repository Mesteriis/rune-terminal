package codexauth

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	defaultAuthFileName   = "auth.json"
	defaultAuthDirName    = ".codex"
	StatusReady           = "ready"
	StatusMissing         = "missing"
	StatusInvalid         = "invalid"
	defaultAPIBaseURL     = "https://api.openai.com/v1"
	defaultChatGPTBaseURL = "https://chatgpt.com/backend-api/codex"
)

var (
	ErrAuthFileNotFound = errors.New("codex auth file not found")
	ErrCredentialsEmpty = errors.New("codex credentials are missing")
)

type State struct {
	AuthFilePath   string
	AuthMode       string
	Status         string
	StatusMessage  string
	LastRefresh    time.Time
	AccountID      string
	HasAPIKey      bool
	HasAccessToken bool
}

type Credentials struct {
	AuthFilePath string
	AuthMode     string
	BaseURL      string
	Token        string
	AccountID    string
}

type authFile struct {
	OpenAIAPIKey string `json:"OPENAI_API_KEY,omitempty"`
	AuthMode     string `json:"auth_mode,omitempty"`
	LastRefresh  string `json:"last_refresh,omitempty"`
	Tokens       struct {
		AccessToken string `json:"access_token,omitempty"`
		AccountID   string `json:"account_id,omitempty"`
	} `json:"tokens,omitempty"`
}

func ResolveAuthFilePath(raw string) string {
	path := strings.TrimSpace(raw)
	if path == "" {
		homeDir, err := os.UserHomeDir()
		if err != nil || strings.TrimSpace(homeDir) == "" {
			return ""
		}
		path = filepath.Join(homeDir, defaultAuthDirName, defaultAuthFileName)
	}
	if strings.HasPrefix(path, "~/") {
		homeDir, err := os.UserHomeDir()
		if err == nil && strings.TrimSpace(homeDir) != "" {
			path = filepath.Join(homeDir, path[2:])
		}
	}
	return filepath.Clean(path)
}

func LoadState(rawPath string) (State, error) {
	path := ResolveAuthFilePath(rawPath)
	state := State{
		AuthFilePath: path,
		Status:       StatusMissing,
	}
	if strings.TrimSpace(path) == "" {
		state.Status = StatusInvalid
		state.StatusMessage = "Codex auth file path could not be resolved."
		return state, fmt.Errorf("%w: unable to resolve auth file path", ErrAuthFileNotFound)
	}

	payload, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			state.StatusMessage = "No Codex auth file was found on this machine."
			return state, fmt.Errorf("%w: %s", ErrAuthFileNotFound, path)
		}
		state.Status = StatusInvalid
		state.StatusMessage = "Codex auth file could not be read."
		return state, err
	}

	var decoded authFile
	if err := json.Unmarshal(payload, &decoded); err != nil {
		state.Status = StatusInvalid
		state.StatusMessage = "Codex auth file is not valid JSON."
		return state, err
	}

	state.AuthMode = strings.TrimSpace(decoded.AuthMode)
	state.AccountID = strings.TrimSpace(decoded.Tokens.AccountID)
	state.HasAPIKey = strings.TrimSpace(decoded.OpenAIAPIKey) != ""
	state.HasAccessToken = strings.TrimSpace(decoded.Tokens.AccessToken) != ""
	if decoded.LastRefresh != "" {
		if lastRefresh, err := time.Parse(time.RFC3339Nano, decoded.LastRefresh); err == nil {
			state.LastRefresh = lastRefresh.UTC()
		}
	}

	switch {
	case state.HasAPIKey:
		state.Status = StatusReady
		state.StatusMessage = "OpenAI API key credentials are available from the local Codex auth state."
	case state.HasAccessToken:
		state.Status = StatusReady
		state.StatusMessage = "ChatGPT OAuth credentials are available from the local Codex auth state."
	default:
		state.Status = StatusInvalid
		state.StatusMessage = "Codex auth file does not contain usable credentials."
		return state, ErrCredentialsEmpty
	}

	return state, nil
}

func LoadCredentials(rawPath string) (Credentials, State, error) {
	state, err := LoadState(rawPath)
	if err != nil {
		return Credentials{}, state, err
	}

	payload, err := os.ReadFile(state.AuthFilePath)
	if err != nil {
		return Credentials{}, state, err
	}
	var decoded authFile
	if err := json.Unmarshal(payload, &decoded); err != nil {
		return Credentials{}, state, err
	}

	if apiKey := strings.TrimSpace(decoded.OpenAIAPIKey); apiKey != "" {
		return Credentials{
			AuthFilePath: state.AuthFilePath,
			AuthMode:     state.AuthMode,
			BaseURL:      defaultAPIBaseURL,
			Token:        apiKey,
			AccountID:    state.AccountID,
		}, state, nil
	}

	if accessToken := strings.TrimSpace(decoded.Tokens.AccessToken); accessToken != "" {
		return Credentials{
			AuthFilePath: state.AuthFilePath,
			AuthMode:     state.AuthMode,
			BaseURL:      defaultChatGPTBaseURL,
			Token:        accessToken,
			AccountID:    state.AccountID,
		}, state, nil
	}

	return Credentials{}, state, ErrCredentialsEmpty
}
