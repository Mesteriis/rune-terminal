package agent

import "github.com/Mesteriis/rune-terminal/core/policy"

type Catalog struct {
	Profiles []PromptProfile `json:"profiles"`
	Roles    []RolePreset    `json:"roles"`
	Modes    []WorkMode      `json:"modes"`
	Active   SelectionView   `json:"active"`
}

type SelectionView struct {
	Profile                PromptProfile            `json:"profile"`
	Role                   RolePreset               `json:"role"`
	Mode                   WorkMode                 `json:"mode"`
	EffectivePrompt        string                   `json:"effective_prompt"`
	EffectivePolicyProfile policy.EvaluationProfile `json:"effective_policy_profile"`
}

func (s Selection) View() SelectionView {
	return SelectionView{
		Profile:                s.Profile,
		Role:                   s.Role,
		Mode:                   s.Mode,
		EffectivePrompt:        s.EffectivePrompt(),
		EffectivePolicyProfile: s.EffectivePolicyProfile(),
	}
}
