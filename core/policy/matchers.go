package policy

import (
	"path/filepath"
	"regexp"
	"slices"
	"strings"
)

func scopeMatches(scope Scope, scopeRef string, ctx Context) bool {
	switch scope {
	case ScopeGlobal:
		return true
	case ScopeWorkspace:
		return scopeRef != "" && scopeRef == ctx.WorkspaceID
	case ScopeRepo:
		return scopeRef != "" && filepath.Clean(scopeRef) == filepath.Clean(ctx.RepoRoot)
	default:
		return false
	}
}

func matchStructured(matcher *StructuredMatcher, ctx Context) bool {
	if matcher == nil {
		return false
	}
	if len(matcher.ToolNames) > 0 && !slices.Contains(matcher.ToolNames, ctx.ToolName) {
		return false
	}
	if len(matcher.WidgetIDs) > 0 {
		matchedWidget := false
		for _, widgetID := range ctx.AffectedWidgets {
			if slices.Contains(matcher.WidgetIDs, widgetID) {
				matchedWidget = true
				break
			}
		}
		if !matchedWidget {
			return false
		}
	}
	for _, token := range matcher.SummaryContains {
		if !strings.Contains(strings.ToLower(ctx.Summary), strings.ToLower(token)) {
			return false
		}
	}
	return true
}

func matchString(matcherType MatcherType, matcher string, value string) bool {
	switch matcherType {
	case MatcherExact:
		return matcher == value
	case MatcherGlob:
		ok, err := filepath.Match(matcher, value)
		return err == nil && ok
	case MatcherRegex:
		re, err := regexp.Compile(matcher)
		return err == nil && re.MatchString(value)
	default:
		return false
	}
}
