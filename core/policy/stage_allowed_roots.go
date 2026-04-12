package policy

import (
	"path/filepath"
	"slices"
	"strings"
)

func allowedRootsStage(p *evaluationPipeline) bool {
	if !p.ctx.RequiresAllowedRoots || len(p.ctx.AffectedPaths) == 0 {
		return false
	}
	for _, target := range p.ctx.AffectedPaths {
		if pathAllowed(target, p.decision.AllowedRoots) || p.ctx.HasApproval {
			continue
		}
		p.decision.Allowed = false
		p.decision.RequiresConfirmation = true
		p.decision.Reason = "allowed_root_confirmation_required"
		return true
	}
	return false
}

func normalizeRoots(roots []string) []string {
	var normalized []string
	for _, root := range roots {
		root = filepath.Clean(root)
		if root == "." || root == "" {
			continue
		}
		normalized = append(normalized, root)
	}
	return slices.Compact(normalized)
}

func pathAllowed(path string, roots []string) bool {
	path = filepath.Clean(path)
	for _, root := range roots {
		root = filepath.Clean(root)
		if path == root || strings.HasPrefix(path, root+string(filepath.Separator)) {
			return true
		}
	}
	return false
}
