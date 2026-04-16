package example

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	pluginruntime "github.com/Mesteriis/rune-terminal/core/plugins"
)

type requestInput struct {
	Text string `json:"text"`
}

func Run(stdin io.Reader, stdout io.Writer) error {
	reader := bufio.NewReader(stdin)
	writer := bufio.NewWriter(stdout)
	defer writer.Flush()

	var handshake pluginruntime.PluginHandshakeRequest
	if err := readJSONLine(reader, &handshake); err != nil {
		return err
	}
	if handshake.Type != pluginruntime.MessageTypeHandshake {
		return fmt.Errorf("unexpected handshake type: %s", handshake.Type)
	}
	if strings.TrimSpace(handshake.ProtocolVersion) != pluginruntime.ProtocolVersionV1 {
		return fmt.Errorf("unsupported protocol version: %s", handshake.ProtocolVersion)
	}

	if err := writeJSONLine(writer, pluginruntime.PluginHandshakeResponse{
		Type:            pluginruntime.MessageTypeHandshake,
		ProtocolVersion: pluginruntime.ProtocolVersionV1,
		Plugin: pluginruntime.PluginMetadata{
			Name:         "example.side_process",
			Version:      "1.0.0",
			Capabilities: []string{"tool.execute"},
		},
	}); err != nil {
		return err
	}

	var request pluginruntime.PluginRequest
	if err := readJSONLine(reader, &request); err != nil {
		return err
	}

	input, err := decodeInput(request.Input)
	if err != nil {
		return writeJSONLine(writer, pluginruntime.PluginResponse{
			Type:      pluginruntime.MessageTypeResponse,
			RequestID: request.RequestID,
			Status:    pluginruntime.PluginResponseStatusError,
			Error: &pluginruntime.PluginError{
				Code:    "invalid_input",
				Message: err.Error(),
			},
		})
	}

	output, err := json.Marshal(map[string]any{
		"text":         input.Text,
		"length":       len(input.Text),
		"workspace_id": request.Context.WorkspaceID,
		"repo_root":    request.Context.RepoRoot,
	})
	if err != nil {
		return err
	}

	return writeJSONLine(writer, pluginruntime.PluginResponse{
		Type:      pluginruntime.MessageTypeResponse,
		RequestID: request.RequestID,
		Status:    pluginruntime.PluginResponseStatusOK,
		Output:    output,
	})
}

func decodeInput(raw json.RawMessage) (requestInput, error) {
	if len(raw) == 0 {
		return requestInput{}, fmt.Errorf("text is required")
	}
	var input requestInput
	if err := json.Unmarshal(raw, &input); err != nil {
		return requestInput{}, fmt.Errorf("invalid input payload")
	}
	if strings.TrimSpace(input.Text) == "" {
		return requestInput{}, fmt.Errorf("text is required")
	}
	return input, nil
}

func readJSONLine(reader *bufio.Reader, target any) error {
	line, err := reader.ReadBytes('\n')
	if err != nil {
		return err
	}
	return json.Unmarshal(line, target)
}

func writeJSONLine(writer *bufio.Writer, value any) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	if _, err := writer.Write(payload); err != nil {
		return err
	}
	if err := writer.WriteByte('\n'); err != nil {
		return err
	}
	return writer.Flush()
}
