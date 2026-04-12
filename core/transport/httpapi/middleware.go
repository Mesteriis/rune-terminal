package httpapi

import (
	"net/http"
	"strings"
)

func (api *API) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/healthz" || api.authToken == "" {
			next.ServeHTTP(w, r)
			return
		}

		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" && allowsQueryToken(r.URL.Path) {
			token = r.URL.Query().Get("token")
		}
		if token != api.authToken {
			writeUnauthorized(w)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func allowsQueryToken(path string) bool {
	return strings.HasPrefix(path, "/api/v1/terminal/") && strings.HasSuffix(path, "/stream")
}
