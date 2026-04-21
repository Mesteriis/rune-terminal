package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
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
	Content string `json:"content"`
	Path    string `json:"path"`
}

func (api *API) handleListFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	allowOutsideWorkspace := r.URL.Query().Get("allow_outside_workspace") == "1"
	var (
		result app.FSListResult
		err    error
	)
	if allowOutsideWorkspace {
		result, err = api.runtime.ListFSUnbounded(path)
	} else {
		result, err = api.runtime.ListFS(path)
	}
	if err != nil {
		writeFSError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleReadFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	maxBytes := parseInt(r.URL.Query().Get("max_bytes"), defaultFSPreviewBytes)
	allowOutsideWorkspace := r.URL.Query().Get("allow_outside_workspace") == "1"
	if maxBytes <= 0 {
		maxBytes = defaultFSPreviewBytes
	}
	if maxBytes > maxFSPreviewBytes {
		maxBytes = maxFSPreviewBytes
	}
	var (
		result app.FSReadResult
		err    error
	)
	if allowOutsideWorkspace {
		result, err = api.runtime.ReadFSPreviewUnbounded(path, maxBytes)
	} else {
		result, err = api.runtime.ReadFSPreview(path, maxBytes)
	}
	if err != nil {
		writeFSError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleReadFSFile(w http.ResponseWriter, r *http.Request) {
	result, err := api.runtime.ReadFSFile(r.URL.Query().Get("path"))
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

	result, err := api.runtime.WriteFSFile(request.Path, request.Content)
	if err != nil {
		writeFSError(w, err)
		return
	}

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
		writeFSError(w, err)
		return
	}

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
		writeFSError(w, err)
		return
	}

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
		writeFSError(w, err)
		return
	}

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
		writeFSError(w, err)
		return
	}

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
		writeFSError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, result)
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
	case errors.Is(err, app.ErrFSPathOutsideWorkspace):
		writeForbidden(w, "fs_path_outside_workspace", err.Error())
	case errors.Is(err, app.ErrFSPathNotFound):
		writeNotFound(w, "fs_path_not_found", err.Error())
	case errors.Is(err, app.ErrFSPathExists):
		writeError(w, http.StatusConflict, "fs_path_exists", err.Error())
	default:
		writeInternalError(w, err)
	}
}
