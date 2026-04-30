package app

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/Mesteriis/rune-terminal/core/connections"
	"github.com/Mesteriis/rune-terminal/core/workspace"
)

type remoteFSExecResult struct {
	Stderr string
	Stdout []byte
}

var runRemoteFSCommand = defaultRunRemoteFSCommand

func (r *Runtime) ListFSForConnection(
	ctx context.Context,
	path string,
	query string,
	connectionID string,
	allowOutsideWorkspace bool,
) (FSListResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSListResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		if allowOutsideWorkspace {
			return r.ListFSUnbounded(path, query)
		}
		return r.ListFS(path, query)
	}
	return r.listRemoteFS(ctx, connection, path, query)
}

func (r *Runtime) ListFSForWidget(
	ctx context.Context,
	path string,
	query string,
	connectionID string,
	widgetID string,
) (FSListResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSListResult{}, err
	}
	if connection.Kind == connections.KindSSH {
		return r.listRemoteFS(ctx, connection, path, query)
	}
	if root, ok := r.localFSWidgetRoot(widgetID, connectionID, workspace.WidgetKindFiles); ok {
		return r.listFSWithinRoot(path, query, root)
	}
	return r.ListFS(path, query)
}

func (r *Runtime) ReadFSPreviewForConnection(
	ctx context.Context,
	path string,
	maxBytes int,
	connectionID string,
	allowOutsideWorkspace bool,
) (FSReadResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSReadResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		if allowOutsideWorkspace {
			return r.ReadFSPreviewUnbounded(path, maxBytes)
		}
		return r.ReadFSPreview(path, maxBytes)
	}
	return r.readRemoteFSPreview(ctx, connection, path, maxBytes)
}

func (r *Runtime) ReadFSPreviewForWidget(
	ctx context.Context,
	path string,
	maxBytes int,
	connectionID string,
	widgetID string,
) (FSReadResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSReadResult{}, err
	}
	if connection.Kind == connections.KindSSH {
		return r.readRemoteFSPreview(ctx, connection, path, maxBytes)
	}
	if root, ok := r.localFSWidgetRoot(widgetID, connectionID, workspace.WidgetKindFiles); ok {
		return r.readFSPreviewWithinRoot(path, maxBytes, root)
	}
	if previewPath, ok := r.localFSPreviewWidgetPath(widgetID, connectionID); ok {
		targetPath, err := resolveLocalFSPreviewWidgetPath(previewPath, path)
		if err != nil {
			return FSReadResult{}, err
		}
		return readFSPreviewResolved(targetPath, maxBytes)
	}
	return r.ReadFSPreview(path, maxBytes)
}

func (r *Runtime) ReadFSFileForConnection(
	ctx context.Context,
	path string,
	connectionID string,
) (FSFileResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSFileResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		return r.ReadFSFile(path)
	}
	return r.readRemoteFSFile(ctx, connection, path)
}

func (r *Runtime) WriteFSFileForConnection(
	ctx context.Context,
	path string,
	content string,
	connectionID string,
) (FSFileResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSFileResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		return r.WriteFSFile(path, content)
	}
	return r.writeRemoteFSFile(ctx, connection, path, content)
}

func (r *Runtime) OpenFSExternalForConnection(
	ctx context.Context,
	path string,
	connectionID string,
) (FSOpenResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSOpenResult{}, err
	}
	if connection.Kind != connections.KindSSH {
		return r.OpenFSExternal(path)
	}
	return FSOpenResult{}, fmt.Errorf("%w: remote external open is unavailable", ErrFSExternalOpenUnsupported)
}

func (r *Runtime) OpenFSExternalForWidget(
	ctx context.Context,
	path string,
	connectionID string,
	widgetID string,
) (FSOpenResult, error) {
	connection, err := r.resolveFSConnection(connectionID)
	if err != nil {
		return FSOpenResult{}, err
	}
	if connection.Kind == connections.KindSSH {
		return FSOpenResult{}, fmt.Errorf("%w: remote external open is unavailable", ErrFSExternalOpenUnsupported)
	}
	if root, ok := r.localFSWidgetRoot(widgetID, connectionID, workspace.WidgetKindFiles); ok {
		targetPath, err := resolveFSPathInRoot(root, path)
		if err != nil {
			return FSOpenResult{}, err
		}
		if err := openFSExternal(targetPath); err != nil {
			return FSOpenResult{}, err
		}
		return FSOpenResult{Path: targetPath}, nil
	}
	if previewPath, ok := r.localFSPreviewWidgetPath(widgetID, connectionID); ok {
		targetPath, err := resolveLocalFSPreviewWidgetOpenPath(previewPath, path)
		if err != nil {
			return FSOpenResult{}, err
		}
		if err := openFSExternal(targetPath); err != nil {
			return FSOpenResult{}, err
		}
		return FSOpenResult{Path: targetPath}, nil
	}
	return r.OpenFSExternal(path)
}

func (r *Runtime) resolveFSConnection(connectionID string) (connections.Connection, error) {
	connectionID = strings.TrimSpace(connectionID)
	if connectionID == "" || connectionID == string(connections.KindLocal) {
		return connections.Connection{
			ID:   string(connections.KindLocal),
			Kind: connections.KindLocal,
			Name: "Local",
		}, nil
	}
	if r.Connections == nil {
		return connections.Connection{}, fmt.Errorf("%w: %s", connections.ErrConnectionNotFound, connectionID)
	}
	return r.Connections.Resolve(connectionID)
}

func (r *Runtime) localFSWidgetRoot(
	widgetID string,
	connectionID string,
	allowedKinds ...workspace.WidgetKind,
) (string, bool) {
	widgetID = strings.TrimSpace(widgetID)
	if widgetID == "" || r == nil || r.Workspace == nil {
		return "", false
	}
	requestedConnectionID := normalizeLocalFSConnectionID(connectionID)
	if !isLocalFSConnectionID(requestedConnectionID) {
		return "", false
	}
	allowedKindSet := make(map[workspace.WidgetKind]struct{}, len(allowedKinds))
	for _, kind := range allowedKinds {
		allowedKindSet[kind] = struct{}{}
	}
	for _, widget := range r.Workspace.Snapshot().Widgets {
		if widget.ID != widgetID {
			continue
		}
		if _, ok := allowedKindSet[widget.Kind]; !ok {
			return "", false
		}
		if !isLocalFSConnectionID(normalizeLocalFSConnectionID(widget.ConnectionID)) {
			return "", false
		}
		root := strings.TrimSpace(widget.Path)
		if root == "" {
			return "", false
		}
		return root, true
	}
	return "", false
}

func (r *Runtime) localFSPreviewWidgetPath(widgetID string, connectionID string) (string, bool) {
	widgetID = strings.TrimSpace(widgetID)
	if widgetID == "" || r == nil || r.Workspace == nil {
		return "", false
	}
	requestedConnectionID := normalizeLocalFSConnectionID(connectionID)
	if !isLocalFSConnectionID(requestedConnectionID) {
		return "", false
	}
	for _, widget := range r.Workspace.Snapshot().Widgets {
		if widget.ID != widgetID {
			continue
		}
		if widget.Kind != workspace.WidgetKindPreview {
			return "", false
		}
		if !isLocalFSConnectionID(normalizeLocalFSConnectionID(widget.ConnectionID)) {
			return "", false
		}
		path := strings.TrimSpace(widget.Path)
		if path == "" {
			return "", false
		}
		return path, true
	}
	return "", false
}

func resolveLocalFSPreviewWidgetPath(previewPath string, requestedPath string) (string, error) {
	previewDir := filepath.Dir(previewPath)
	resolvedPreviewPath, err := resolveFSPathInRoot(previewDir, previewPath)
	if err != nil {
		return "", err
	}
	targetPath, err := resolveFSPathInRoot(previewDir, requestedPath)
	if err != nil {
		return "", err
	}
	if targetPath != resolvedPreviewPath {
		return "", ErrFSPathOutsideWorkspace
	}
	return targetPath, nil
}

func resolveLocalFSPreviewWidgetOpenPath(previewPath string, requestedPath string) (string, error) {
	previewDir := filepath.Dir(previewPath)
	resolvedPreviewPath, err := resolveFSPathInRoot(previewDir, previewPath)
	if err != nil {
		return "", err
	}
	targetPath, err := resolveFSPathInRoot(previewDir, requestedPath)
	if err != nil {
		return "", err
	}
	if targetPath != resolvedPreviewPath && targetPath != filepath.Clean(previewDir) {
		return "", ErrFSPathOutsideWorkspace
	}
	return targetPath, nil
}

func normalizeLocalFSConnectionID(connectionID string) string {
	connectionID = strings.TrimSpace(connectionID)
	if connectionID == "" {
		return string(connections.KindLocal)
	}
	return connectionID
}

func isLocalFSConnectionID(connectionID string) bool {
	connectionID = strings.TrimSpace(connectionID)
	return connectionID == "" ||
		connectionID == string(connections.KindLocal) ||
		strings.HasPrefix(connectionID, string(connections.KindLocal)+":")
}

func (r *Runtime) listRemoteFS(
	ctx context.Context,
	connection connections.Connection,
	path string,
	query string,
) (FSListResult, error) {
	remotePath := normalizeRemoteFSPath(path, ".")
	script := fmt.Sprintf(
		"set -eu\n"+
			"path=%s\n"+
			"if [ ! -e \"$path\" ]; then printf '__RTERR__not_found\\n'; exit 4; fi\n"+
			"if [ ! -d \"$path\" ]; then printf '__RTERR__not_directory\\n'; exit 5; fi\n"+
			"cd \"$path\"\n"+
			"pwd\n"+
			"printf '__RTSEP__\\n'\n"+
			"find . -mindepth 1 -maxdepth 1 -print | LC_ALL=C sort | while IFS= read -r entry; do\n"+
			"  name=${entry#./}\n"+
			"  [ -n \"$name\" ] || continue\n"+
			"  if [ -d \"$entry\" ]; then kind=directory; else kind=file; fi\n"+
			"  if stat_out=$(stat -c '%%Y\t%%s' \"$entry\" 2>/dev/null); then :; elif stat_out=$(stat -f '%%m\t%%z' \"$entry\" 2>/dev/null); then :; else stat_out='0\t0'; fi\n"+
			"  printf '%%s\t%%s\t%%s\\n' \"$name\" \"$kind\" \"$stat_out\"\n"+
			"done\n",
		quoteRemoteShellArg(remotePath),
	)
	result, err := runRemoteFSCommand(ctx, connection, []string{"sh", "-lc", script}, nil)
	if err != nil {
		return FSListResult{}, normalizeRemoteFSError(result, err)
	}

	stdout := string(result.Stdout)
	parts := strings.SplitN(stdout, "__RTSEP__\n", 2)
	if len(parts) != 2 {
		return FSListResult{}, errors.New("remote directory listing returned an invalid payload")
	}

	resolvedPath := strings.TrimSpace(parts[0])
	if resolvedPath == "" {
		resolvedPath = remotePath
	}
	listing := strings.TrimSpace(parts[1])
	queryMatchers := compileFSListQueryMatchers(query)
	fsResult := FSListResult{
		Path:        resolvedPath,
		Directories: []FSNode{},
		Files:       []FSNode{},
	}

	if listing == "" {
		return fsResult, nil
	}

	for _, line := range strings.Split(listing, "\n") {
		fields := strings.SplitN(strings.TrimSpace(line), "\t", 4)
		if len(fields) != 4 {
			continue
		}
		name := fields[0]
		if !matchesFSListQuery(name, queryMatchers) {
			continue
		}
		node := FSNode{
			Name:         name,
			Type:         fields[1],
			ModifiedTime: parseRemoteFSInt(fields[2]),
			Size:         parseRemoteFSInt(fields[3]),
		}
		if node.Type == "directory" {
			node.Size = 0
			fsResult.Directories = append(fsResult.Directories, node)
			continue
		}
		node.Type = "file"
		fsResult.Files = append(fsResult.Files, node)
	}

	sort.Slice(fsResult.Directories, func(i, j int) bool {
		return strings.ToLower(fsResult.Directories[i].Name) < strings.ToLower(fsResult.Directories[j].Name)
	})
	sort.Slice(fsResult.Files, func(i, j int) bool {
		return strings.ToLower(fsResult.Files[i].Name) < strings.ToLower(fsResult.Files[j].Name)
	})
	return fsResult, nil
}

func (r *Runtime) readRemoteFSPreview(
	ctx context.Context,
	connection connections.Connection,
	path string,
	maxBytes int,
) (FSReadResult, error) {
	remotePath := normalizeRemoteFSPath(path, ".")
	limit := maxBytes
	if limit <= 0 {
		limit = 8192
	}
	script := fmt.Sprintf(
		"set -eu\n"+
			"path=%s\n"+
			"if [ ! -e \"$path\" ]; then printf '__RTERR__not_found\\n'; exit 4; fi\n"+
			"if [ -d \"$path\" ]; then printf '__RTERR__not_file\\n'; exit 5; fi\n"+
			"size=$(wc -c < \"$path\" | tr -d '[:space:]')\n"+
			"printf '__RTMETA__%%s\\n' \"$size\"\n"+
			"dd if=\"$path\" bs=1 count=%d 2>/dev/null | base64\n",
		quoteRemoteShellArg(remotePath),
		limit+1,
	)
	result, err := runRemoteFSCommand(ctx, connection, []string{"sh", "-lc", script}, nil)
	if err != nil {
		return FSReadResult{}, normalizeRemoteFSError(result, err)
	}

	payload, sizeBytes, err := parseRemoteFSBase64Payload(result.Stdout)
	if err != nil {
		return FSReadResult{}, err
	}
	truncated := len(payload) > limit
	if truncated {
		payload = payload[:limit]
	}
	if hasNULByte(payload) || !utf8.Valid(payload) {
		return FSReadResult{
			Path:             remotePath,
			Preview:          formatHexPreview(payload),
			PreviewAvailable: true,
			PreviewKind:      "hex",
			PreviewBytes:     len(payload),
			SizeBytes:        sizeBytes,
			Truncated:        truncated,
		}, nil
	}

	return FSReadResult{
		Path:             remotePath,
		Preview:          string(payload),
		PreviewAvailable: true,
		PreviewKind:      "text",
		PreviewBytes:     len(payload),
		SizeBytes:        sizeBytes,
		Truncated:        truncated,
	}, nil
}

func (r *Runtime) readRemoteFSFile(
	ctx context.Context,
	connection connections.Connection,
	path string,
) (FSFileResult, error) {
	remotePath := normalizeRemoteFSPath(path, ".")
	script := fmt.Sprintf(
		"set -eu\n"+
			"path=%s\n"+
			"if [ ! -e \"$path\" ]; then printf '__RTERR__not_found\\n'; exit 4; fi\n"+
			"if [ -d \"$path\" ]; then printf '__RTERR__not_file\\n'; exit 5; fi\n"+
			"size=$(wc -c < \"$path\" | tr -d '[:space:]')\n"+
			"case \"$size\" in ''|*[!0-9]*) size=0 ;; esac\n"+
			"if [ \"$size\" -gt %d ]; then printf '__RTERR__too_large\\n'; exit 6; fi\n"+
			"printf '__RTMETA__%%s\\n' \"$size\"\n"+
			"base64 < \"$path\"\n",
		quoteRemoteShellArg(remotePath),
		maxFSFileContentBytes,
	)
	result, err := runRemoteFSCommand(ctx, connection, []string{"sh", "-lc", script}, nil)
	if err != nil {
		return FSFileResult{}, normalizeRemoteFSError(result, err)
	}
	payload, _, err := parseRemoteFSBase64Payload(result.Stdout)
	if err != nil {
		return FSFileResult{}, err
	}
	if hasNULByte(payload) || !utf8.Valid(payload) {
		return FSFileResult{}, ErrFSPathNotText
	}
	return FSFileResult{
		Path:    remotePath,
		Content: string(payload),
	}, nil
}

func (r *Runtime) writeRemoteFSFile(
	ctx context.Context,
	connection connections.Connection,
	path string,
	content string,
) (FSFileResult, error) {
	if len([]byte(content)) > maxFSFileContentBytes {
		return FSFileResult{}, ErrFSPathTooLarge
	}

	if _, err := r.readRemoteFSFile(ctx, connection, path); err != nil {
		return FSFileResult{}, err
	}

	remotePath := normalizeRemoteFSPath(path, ".")
	script := fmt.Sprintf(
		"set -eu\n"+
			"path=%s\n"+
			"if [ ! -e \"$path\" ]; then printf '__RTERR__not_found\\n' >&2; exit 4; fi\n"+
			"if [ -d \"$path\" ]; then printf '__RTERR__not_file\\n' >&2; exit 5; fi\n"+
			"cat > \"$path\"\n",
		quoteRemoteShellArg(remotePath),
	)
	result, err := runRemoteFSCommand(ctx, connection, []string{"sh", "-lc", script}, []byte(content))
	if err != nil {
		return FSFileResult{}, normalizeRemoteFSError(result, err)
	}
	return FSFileResult{
		Path:    remotePath,
		Content: content,
	}, nil
}

func defaultRunRemoteFSCommand(
	ctx context.Context,
	connection connections.Connection,
	remoteArgs []string,
	stdin []byte,
) (remoteFSExecResult, error) {
	if connection.Kind != connections.KindSSH || connection.SSH == nil {
		return remoteFSExecResult{}, fmt.Errorf("%w: remote files require an ssh connection", connections.ErrInvalidConnection)
	}

	sshPath, args, err := connections.BuildSSHCommandArgs(connection.SSH, remoteArgs...)
	if err != nil {
		return remoteFSExecResult{}, err
	}

	cmd := exec.CommandContext(ctx, sshPath, args...)
	cmd.Env = append(cmd.Environ(), "TERM=dumb")
	if len(stdin) > 0 {
		cmd.Stdin = bytes.NewReader(stdin)
	}

	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	return remoteFSExecResult{
		Stdout: stdout.Bytes(),
		Stderr: stderr.String(),
	}, err
}

func normalizeRemoteFSError(result remoteFSExecResult, err error) error {
	combined := strings.TrimSpace(strings.Join([]string{
		string(result.Stdout),
		result.Stderr,
		errorString(err),
	}, "\n"))
	switch {
	case strings.Contains(combined, "__RTERR__not_found"):
		return ErrFSPathNotFound
	case strings.Contains(combined, "__RTERR__not_directory"):
		return ErrFSPathNotDirectory
	case strings.Contains(combined, "__RTERR__not_file"):
		return ErrFSPathNotFile
	case strings.Contains(combined, "__RTERR__too_large"):
		return ErrFSPathTooLarge
	default:
		return errors.New(strings.TrimSpace(combined))
	}
}

func parseRemoteFSBase64Payload(stdout []byte) ([]byte, int64, error) {
	lines := strings.SplitN(string(stdout), "\n", 2)
	if len(lines) != 2 || !strings.HasPrefix(lines[0], "__RTMETA__") {
		return nil, 0, errors.New("remote file payload is invalid")
	}
	sizeBytes, err := strconv.ParseInt(strings.TrimPrefix(strings.TrimSpace(lines[0]), "__RTMETA__"), 10, 64)
	if err != nil {
		return nil, 0, errors.New("remote file size metadata is invalid")
	}

	encoded := strings.Map(func(r rune) rune {
		if r == '\n' || r == '\r' || r == '\t' || r == ' ' {
			return -1
		}
		return r
	}, lines[1])
	payload, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, 0, err
	}
	return payload, sizeBytes, nil
}

func normalizeRemoteFSPath(path string, fallback string) string {
	trimmedPath := strings.TrimSpace(path)
	if trimmedPath == "" {
		trimmedPath = fallback
	}
	cleanedPath := filepath.Clean(trimmedPath)
	if cleanedPath == "." && strings.HasPrefix(trimmedPath, "/") {
		return "/"
	}
	return cleanedPath
}

func parseRemoteFSInt(raw string) int64 {
	value, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil {
		return 0
	}
	return value
}

func quoteRemoteShellArg(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}

func errorString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}
