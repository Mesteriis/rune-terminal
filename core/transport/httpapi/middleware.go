package httpapi

import (
	"crypto/subtle"
	"net/http"
	"net/url"
	"strings"
)

func (api *API) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		addVaryHeader(w, "Origin")
		if origin != "" {
			if !isAllowedOrigin(origin) {
				writeForbidden(w, "origin_not_allowed", "origin not allowed")
				return
			} else {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			}
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) withAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if isPublicPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		if api.authToken == "" {
			writeServiceUnavailable(w, "auth_not_configured", "server auth token not configured")
			return
		}

		token := parseBearerToken(r.Header.Get("Authorization"))
		if token == "" && allowsQueryToken(r.URL.Path) {
			token = r.URL.Query().Get("token")
		}
		if subtle.ConstantTimeCompare([]byte(token), []byte(api.authToken)) != 1 {
			w.Header().Set("WWW-Authenticate", "Bearer")
			writeUnauthorized(w)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isPublicPath(path string) bool {
	return path == "/healthz" || path == "/api/v1/health"
}

func allowsQueryToken(path string) bool {
	return strings.HasPrefix(path, "/api/v1/terminal/") && strings.HasSuffix(path, "/stream")
}

func parseBearerToken(header string) string {
	if !strings.HasPrefix(header, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, "Bearer "))
}

func addVaryHeader(w http.ResponseWriter, value string) {
	current := w.Header().Values("Vary")
	for _, existing := range current {
		for _, part := range strings.Split(existing, ",") {
			if strings.TrimSpace(part) == value {
				return
			}
		}
	}
	w.Header().Add("Vary", value)
}

func isAllowedOrigin(origin string) bool {
	parsed, err := url.Parse(origin)
	if err != nil {
		return false
	}
	switch parsed.Scheme {
	case "tauri":
		return strings.EqualFold(parsed.Host, "localhost")
	case "http", "https":
		host := strings.ToLower(parsed.Hostname())
		return host == "localhost" || host == "127.0.0.1" || host == "::1" || host == "tauri.localhost"
	default:
		return false
	}
}
