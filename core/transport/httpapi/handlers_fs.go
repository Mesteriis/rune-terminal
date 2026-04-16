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

func (api *API) handleListFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	result, err := api.runtime.ListFS(path)
	if err != nil {
		writeFSError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (api *API) handleReadFS(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Query().Get("path")
	maxBytes := parseInt(r.URL.Query().Get("max_bytes"), defaultFSPreviewBytes)
	if maxBytes <= 0 {
		maxBytes = defaultFSPreviewBytes
	}
	if maxBytes > maxFSPreviewBytes {
		maxBytes = maxFSPreviewBytes
	}
	result, err := api.runtime.ReadFSPreview(path, maxBytes)
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
	case errors.Is(err, app.ErrFSPathNotFile):
		writeBadRequest(w, "invalid_fs_file", err)
	case errors.Is(err, app.ErrFSPathOutsideWorkspace):
		writeForbidden(w, "fs_path_outside_workspace", err.Error())
	case errors.Is(err, app.ErrFSPathNotFound):
		writeNotFound(w, "fs_path_not_found", err.Error())
	default:
		writeInternalError(w, err)
	}
}
