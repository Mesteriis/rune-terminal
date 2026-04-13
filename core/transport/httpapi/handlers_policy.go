package httpapi

import (
	"net/http"

	"github.com/avm/rterm/core/policy"
)

func (api *API) handleTrustedRules(w http.ResponseWriter, r *http.Request) {
	rules := api.runtime.Policy.ListTrustedRules()
	if rules == nil {
		rules = []policy.TrustedRule{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"rules": rules,
	})
}

func (api *API) handleIgnoreRules(w http.ResponseWriter, r *http.Request) {
	rules := api.runtime.Policy.ListIgnoreRules()
	if rules == nil {
		rules = []policy.IgnoreRule{}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"rules": rules,
	})
}
