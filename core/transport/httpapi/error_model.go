package httpapi

import (
	"net/http"

	"github.com/Mesteriis/rune-terminal/core/toolruntime"
)

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

func writeError(w http.ResponseWriter, status int, code string, message string) {
	writeJSON(w, status, errorEnvelope{
		Error: apiError{
			Code:    code,
			Message: message,
		},
	})
}

func writeBadRequest(w http.ResponseWriter, code string, err error) {
	writeError(w, http.StatusBadRequest, code, err.Error())
}

func writeUnauthorized(w http.ResponseWriter) {
	writeError(w, http.StatusUnauthorized, "unauthorized", "unauthorized")
}

func writeServiceUnavailable(w http.ResponseWriter, code string, message string) {
	writeError(w, http.StatusServiceUnavailable, code, message)
}

func writeForbidden(w http.ResponseWriter, code string, message string) {
	writeError(w, http.StatusForbidden, code, message)
}

func writeNotFound(w http.ResponseWriter, code string, message string) {
	writeError(w, http.StatusNotFound, code, message)
}

func writeInternalError(w http.ResponseWriter, err error) {
	writeError(w, http.StatusInternalServerError, "internal_failure", err.Error())
}

func writeExecuteResponse(w http.ResponseWriter, response toolruntime.ExecuteResponse) {
	switch response.Status {
	case "ok":
		writeJSON(w, http.StatusOK, response)
	case "requires_confirmation":
		writeJSON(w, http.StatusPreconditionRequired, response)
	case "error":
		writeJSON(w, statusForExecuteError(response.ErrorCode), response)
	default:
		writeJSON(w, http.StatusInternalServerError, response)
	}
}

func statusForExecuteError(code toolruntime.ErrorCode) int {
	switch code {
	case toolruntime.ErrorCodeInvalidInput:
		return http.StatusBadRequest
	case toolruntime.ErrorCodePolicyDenied:
		return http.StatusForbidden
	case toolruntime.ErrorCodeApprovalRequired:
		return http.StatusPreconditionRequired
	case toolruntime.ErrorCodeApprovalMismatch:
		return http.StatusForbidden
	case toolruntime.ErrorCodeNotFound:
		return http.StatusNotFound
	case toolruntime.ErrorCodePluginFailure:
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}
