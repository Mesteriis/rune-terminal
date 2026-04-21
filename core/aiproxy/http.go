package aiproxy

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func newHTTPClient(channel Channel) *http.Client {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if channel.InsecureSkipVerify {
		transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}
	return &http.Client{
		Timeout:   60 * time.Second,
		Transport: transport,
	}
}

func doJSONRequest(
	ctx context.Context,
	channel Channel,
	method string,
	endpoint string,
	apiKey string,
	body any,
) (*http.Response, error) {
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if channel.ServiceType == ServiceTypeClaude {
		req.Header.Set("anthropic-version", anthropicVersion)
	}
	applyAuth(req, channel.EffectiveAuthType(), apiKey)
	return newHTTPClient(channel).Do(req)
}

func applyAuth(req *http.Request, authType AuthType, apiKey string) {
	apiKey = strings.TrimSpace(apiKey)
	if apiKey == "" {
		return
	}
	switch authType {
	case AuthTypeAPIKey:
		req.Header.Set("x-api-key", apiKey)
	case AuthTypeBoth:
		req.Header.Set("x-api-key", apiKey)
		req.Header.Set("Authorization", "Bearer "+apiKey)
	case AuthTypeGoogAPIKey:
		req.Header.Set("x-goog-api-key", apiKey)
	default:
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}
}

func addGeminiAPIKey(endpoint string, apiKey string, authType AuthType) (string, error) {
	if strings.TrimSpace(apiKey) == "" || authType != AuthTypeGoogAPIKey {
		return endpoint, nil
	}
	parsed, err := url.Parse(endpoint)
	if err != nil {
		return "", err
	}
	query := parsed.Query()
	if query.Get("key") == "" {
		query.Set("key", apiKey)
		parsed.RawQuery = query.Encode()
	}
	return parsed.String(), nil
}

func readErrorResponse(kind string, status int, reader io.Reader) error {
	body, _ := io.ReadAll(io.LimitReader(reader, 4096))
	message := strings.TrimSpace(string(body))
	if message == "" {
		message = fmt.Sprintf("%s upstream returned %d", kind, status)
	}
	return &upstreamError{
		status: status,
		msg:    fmt.Sprintf("%s upstream returned %d: %s", kind, status, message),
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
