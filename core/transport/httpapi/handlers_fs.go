package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
	"github.com/Mesteriis/rune-terminal/core/connections"
)

const (
	defaultFSPreviewBytes = 8192
	maxFSPreviewBytes     = 65536
)

type mkdirFSRequest struct {
	Path string `json:"path"`
}

type mutateFSRequest struct {
	Overwrite   bool     `json:"overwrite"`
	SourcePaths []string `json:"source_paths"`
	TargetPath  string   `json:"target_path"`
}

type copyFSEntryRequest struct {
	SourcePath string `json:"source_path"`
	TargetPath string `json:"target_path"`
}

type copyFSRequest struct {
	Entries     []copyFSEntryRequest `json:"entries"`
	Overwrite   bool                 `json:"overwrite"`
	SourcePaths []string             `json:"source_paths"`
	TargetPath  string               `json:"target_path"`
}

type deleteFSRequest struct {
	Paths []string `json:"paths"`
}

type renameFSEntryRequest struct {
	Path     string `json:"path"`
	NextName string `json:"next_name"`
}

type renameFSRequest struct {
	Entries   []renameFSEntryRequest `json:"entries"`
	Overwrite bool                   `json:"overwrite"`
}

type writeFSRequest struct {
	ConnectionID string `json:"connection_id,omitempty"`
	Content      string `json:"content"`
	Path         string `json:"path"`
}

type openFSRequest struct {
	ConnectionID string `json:"connection_id,omitempty"`
	Path         string `json:"path"`
}

func (api *API) handleListFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	query := r.URL.Query().Get("query")
	connectionID := r.URL.Query().Get("connection_id")
	result, err := api.runtime.ListFSForConnection(r.Context(), path, query, connectionID, false)
	if err != nil {
		writeFSError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleReadFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	connectionID := r.URL.Query().Get("connection_id")
	maxBytes := parseInt(r.URL.Query().Get("max_bytes"), defaultFSPreviewBytes)
	if maxBytes <= 0 {
		maxBytes = defaultFSPreviewBytes
	}
	if maxBytes > maxFSPreviewBytes {
		maxBytes = maxFSPreviewBytes
	}
	result, err := api.runtime.ReadFSPreviewForConnection(
		r.Context(),
		path,
		maxBytes,
		connectionID,
		false,
	)
	if err != nil {
		writeFSError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleReadFSFile(w http.ResponseWriter, r *http.Request) {
	result, err := api.runtime.ReadFSFileForConnection(
		r.Context(),
		r.URL.Query().Get("path"),
		r.URL.Query().Get("connection_id"),
	)
	if err != nil {
		writeFSError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleWriteFSFile(w http.ResponseWriter, r *http.Request) {
	var request writeFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	result, err := api.runtime.WriteFSFileForConnection(
		r.Context(),
		request.Path,
		request.Content,
		request.ConnectionID,
	)
	if err != nil {
		api.appendFSMutationAudit("fs.write_file", "Write filesystem file", request.ConnectionID, []string{request.Path}, err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.write_file", "Write filesystem file", request.ConnectionID, []string{result.Path}, nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleOpenFSExternal(w http.ResponseWriter, r *http.Request) {
	var request openFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	result, err := api.runtime.OpenFSExternalForConnection(r.Context(), request.Path, request.ConnectionID)
	if err != nil {
		api.appendFSMutationAudit("fs.open_external", "Open filesystem path externally", request.ConnectionID, []string{request.Path}, err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.open_external", "Open filesystem path externally", request.ConnectionID, []string{result.Path}, nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleMkdirFS(w http.ResponseWriter, r *http.Request) {
	var request mkdirFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	result, err := api.runtime.MkdirFS(request.Path)
	if err != nil {
		api.appendFSMutationAudit("fs.mkdir", "Create filesystem directory", "", []string{request.Path}, err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.mkdir", "Create filesystem directory", "", []string{result.Path}, nil)

	writeJSON(w, http.StatusCreated, result)
}

func (api *API) handleCopyFS(w http.ResponseWriter, r *http.Request) {
	var request copyFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	var (
		result app.FSPathsResult
		err    error
	)
	if len(request.Entries) > 0 {
		entries := make([]app.FSCopyEntry, 0, len(request.Entries))
		for _, entry := range request.Entries {
			entries = append(entries, app.FSCopyEntry{
				SourcePath: entry.SourcePath,
				TargetPath: entry.TargetPath,
			})
		}
		result, err = api.runtime.CopyFSEntries(entries, request.Overwrite)
	} else {
		result, err = api.runtime.CopyFS(request.SourcePaths, request.TargetPath, request.Overwrite)
	}
	if err != nil {
		api.appendFSMutationAudit("fs.copy", "Copy filesystem entries", "", copyFSAuditPaths(request, app.FSPathsResult{}), err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.copy", "Copy filesystem entries", "", copyFSAuditPaths(request, result), nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleMoveFS(w http.ResponseWriter, r *http.Request) {
	var request mutateFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	result, err := api.runtime.MoveFS(request.SourcePaths, request.TargetPath, request.Overwrite)
	if err != nil {
		api.appendFSMutationAudit("fs.move", "Move filesystem entries", "", mutateFSAuditPaths(request, app.FSPathsResult{}), err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.move", "Move filesystem entries", "", mutateFSAuditPaths(request, result), nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleDeleteFS(w http.ResponseWriter, r *http.Request) {
	var request deleteFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	result, err := api.runtime.DeleteFS(request.Paths)
	if err != nil {
		api.appendFSMutationAudit("fs.delete", "Delete filesystem entries", "", request.Paths, err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.delete", "Delete filesystem entries", "", result.Paths, nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleRenameFS(w http.ResponseWriter, r *http.Request) {
	var request renameFSRequest
	if err := decodeJSON(r, &request); err != nil {
		writeBadRequest(w, "invalid_request", err)
		return
	}

	entries := make([]app.FSRenameEntry, 0, len(request.Entries))
	for _, entry := range request.Entries {
		entries = append(entries, app.FSRenameEntry{
			Path:     entry.Path,
			NextName: entry.NextName,
		})
	}

	result, err := api.runtime.RenameFS(entries, request.Overwrite)
	if err != nil {
		api.appendFSMutationAudit("fs.rename", "Rename filesystem entries", "", renameFSAuditPaths(request, app.FSPathsResult{}), err)
		writeFSError(w, err)
		return
	}
	api.appendFSMutationAudit("fs.rename", "Rename filesystem entries", "", renameFSAuditPaths(request, result), nil)

	writeJSON(w, http.StatusOK, result)
}

func (api *API) appendFSMutationAudit(
	toolName string,
	summary string,
	connectionID string,
	paths []string,
	err error,
) {
	if api == nil || api.runtime == nil {
		return
	}
	api.runtime.AppendFSAudit(app.FSAuditInput{
		ToolName:           toolName,
		Summary:            summary,
		ActionSource:       "http.fs",
		TargetConnectionID: connectionID,
		AffectedPaths:      paths,
		Success:            err == nil,
		Error:              err,
	})
}

func copyFSAuditPaths(request copyFSRequest, result app.FSPathsResult) []string {
	paths := make([]string, 0, len(request.Entries)*2+len(request.SourcePaths)+len(result.Paths)+1)
	for _, entry := range request.Entries {
		paths = append(paths, entry.SourcePath, entry.TargetPath)
	}
	paths = append(paths, request.SourcePaths...)
	if request.TargetPath != "" {
		paths = append(paths, request.TargetPath)
	}
	paths = append(paths, result.Paths...)
	return paths
}

func mutateFSAuditPaths(request mutateFSRequest, result app.FSPathsResult) []string {
	paths := make([]string, 0, len(request.SourcePaths)+len(result.Paths)+1)
	paths = append(paths, request.SourcePaths...)
	if request.TargetPath != "" {
		paths = append(paths, request.TargetPath)
	}
	paths = append(paths, result.Paths...)
	return paths
}

func renameFSAuditPaths(request renameFSRequest, result app.FSPathsResult) []string {
	paths := make([]string, 0, len(request.Entries)+len(result.Paths))
	for _, entry := range request.Entries {
		paths = append(paths, entry.Path)
	}
	paths = append(paths, result.Paths...)
	return paths
}

func writeFSError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, app.ErrInvalidFSPath):
		writeBadRequest(w, "invalid_fs_path", err)
	case errors.Is(err, app.ErrInvalidFSName):
		writeBadRequest(w, "invalid_fs_name", err)
	case errors.Is(err, app.ErrInvalidFSTarget):
		writeBadRequest(w, "invalid_fs_target", err)
	case errors.Is(err, app.ErrFSPathNotFile):
		writeBadRequest(w, "invalid_fs_file", err)
	case errors.Is(err, app.ErrFSPathNotDirectory):
		writeBadRequest(w, "invalid_fs_directory", err)
	case errors.Is(err, app.ErrFSPathNotText):
		writeBadRequest(w, "invalid_fs_text", err)
	case errors.Is(err, app.ErrFSPathTooLarge):
		writeError(w, http.StatusRequestEntityTooLarge, "fs_file_too_large", err.Error())
	case errors.Is(err, app.ErrFSPathOutsideWorkspace):
		writeForbidden(w, "fs_path_outside_workspace", err.Error())
	case errors.Is(err, app.ErrFSPathNotFound):
		writeNotFound(w, "fs_path_not_found", err.Error())
	case errors.Is(err, app.ErrFSPathExists):
		writeError(w, http.StatusConflict, "fs_path_exists", err.Error())
	case errors.Is(err, app.ErrFSExternalOpenUnsupported):
		writeError(w, http.StatusServiceUnavailable, "fs_external_open_unsupported", err.Error())
	case errors.Is(err, app.ErrFSExternalOpenUnavailable):
		writeError(w, http.StatusServiceUnavailable, "fs_external_open_unavailable", err.Error())
	case errors.Is(err, connections.ErrConnectionNotFound):
		writeNotFound(w, "connection_not_found", err.Error())
	case errors.Is(err, connections.ErrInvalidConnection):
		writeBadRequest(w, "invalid_connection_request", err)
	default:
		writeInternalError(w, err)
	}
}
