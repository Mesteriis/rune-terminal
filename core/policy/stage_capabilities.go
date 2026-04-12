package policy

import "slices"

func capabilityStage(p *evaluationPipeline) bool {
	for _, capability := range p.ctx.RequiredCapabilities {
		if !slices.Contains(p.decision.EffectiveCapabilities, capability) {
			p.decision.MissingCapabilities = append(p.decision.MissingCapabilities, capability)
		}
	}
	if len(p.decision.MissingCapabilities) == 0 {
		return false
	}
	p.decision.Allowed = false
	p.decision.Reason = "capability_denied"
	return true
}

func effectiveCapabilities(base []string, overlay CapabilityOverlay) []string {
	seen := make(map[string]struct{}, len(base)+len(overlay.Additions))
	var capabilities []string
	for _, capability := range base {
		if _, exists := seen[capability]; exists {
			continue
		}
		seen[capability] = struct{}{}
		capabilities = append(capabilities, capability)
	}
	for _, capability := range overlay.Additions {
		if _, exists := seen[capability]; exists {
			continue
		}
		seen[capability] = struct{}{}
		capabilities = append(capabilities, capability)
	}
	if len(overlay.Removals) == 0 {
		return capabilities
	}
	var filtered []string
	for _, capability := range capabilities {
		if slices.Contains(overlay.Removals, capability) {
			continue
		}
		filtered = append(filtered, capability)
	}
	return filtered
}
