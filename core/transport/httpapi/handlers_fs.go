package httpapi

import (
	"errors"
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/app"
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

func writeFSError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, app.ErrInvalidFSPath):
		writeBadRequest(w, "invalid_fs_path", err)
	case errors.Is(err, app.ErrFSPathNotFound):
		writeNotFound(w, "fs_path_not_found", err.Error())
	default:
		writeInternalError(w, err)
	}
}
