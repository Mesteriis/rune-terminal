package policy

import "time"

const ConfigVersion = "v1alpha1"

type Scope string

const (
	ScopeGlobal    Scope = "global"
	ScopeWorkspace Scope = "workspace"
	ScopeRepo      Scope = "repo"
)

type MatcherType string

const (
	MatcherExact      MatcherType = "exact"
	MatcherGlob       MatcherType = "glob"
	MatcherRegex      MatcherType = "regex"
	MatcherStructured MatcherType = "structured"
)

type ApprovalTier string

const (
	ApprovalTierSafe        ApprovalTier = "safe"
	ApprovalTierModerate    ApprovalTier = "moderate"
	ApprovalTierDangerous   ApprovalTier = "dangerous"
	ApprovalTierDestructive ApprovalTier = "destructive"
)

type IgnoreMode string

const (
	IgnoreModeDeny         IgnoreMode = "deny"
	IgnoreModeMetadataOnly IgnoreMode = "metadata-only"
	IgnoreModeRedact       IgnoreMode = "redact"
)

type SubjectType string

const (
	SubjectTool    SubjectType = "tool"
	SubjectCommand SubjectType = "command"
	SubjectPath    SubjectType = "path"
)

type StructuredMatcher struct {
	ToolNames       []string `json:"tool_names,omitempty"`
	WidgetIDs       []string `json:"widget_ids,omitempty"`
	SummaryContains []string `json:"summary_contains,omitempty"`
}

type CapabilityOverlay struct {
	Additions []string `json:"additions,omitempty"`
	Removals  []string `json:"removals,omitempty"`
}

type ApprovalOverlay struct {
	EscalateBy          int          `json:"escalate_by,omitempty"`
	MinimumMutationTier ApprovalTier `json:"minimum_mutation_tier,omitempty"`
}

type EvaluationProfile struct {
	PromptProfileID           string            `json:"prompt_profile_id,omitempty"`
	RoleID                    string            `json:"role_id,omitempty"`
	ModeID                    string            `json:"mode_id,omitempty"`
	SecurityPosture           string            `json:"security_posture,omitempty"`
	CapabilityOverlay         CapabilityOverlay `json:"capability_overlay,omitempty"`
	ApprovalOverlay           ApprovalOverlay   `json:"approval_overlay,omitempty"`
	DisableTrustedAutoApprove bool              `json:"disable_trusted_auto_approve,omitempty"`
}

type TrustedRule struct {
	ID          string             `json:"id"`
	Scope       Scope              `json:"scope"`
	ScopeRef    string             `json:"scope_ref,omitempty"`
	SubjectType SubjectType        `json:"subject_type"`
	MatcherType MatcherType        `json:"matcher_type"`
	Matcher     string             `json:"matcher,omitempty"`
	Structured  *StructuredMatcher `json:"structured,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
	Note        string             `json:"note,omitempty"`
	Enabled     bool               `json:"enabled"`
}

type IgnoreRule struct {
	ID          string      `json:"id"`
	Scope       Scope       `json:"scope"`
	ScopeRef    string      `json:"scope_ref,omitempty"`
	MatcherType MatcherType `json:"matcher_type"`
	Pattern     string      `json:"pattern"`
	Mode        IgnoreMode  `json:"mode"`
	CreatedAt   time.Time   `json:"created_at"`
	Note        string      `json:"note,omitempty"`
	Enabled     bool        `json:"enabled"`
}

type Config struct {
	Version             string        `json:"version"`
	AllowedRoots        []string      `json:"allowed_roots,omitempty"`
	DefaultCapabilities []string      `json:"default_capabilities,omitempty"`
	TrustedRules        []TrustedRule `json:"trusted_rules,omitempty"`
	IgnoreRules         []IgnoreRule  `json:"ignore_rules,omitempty"`
}

type Context struct {
	ToolName             string
	Summary              string
	WorkspaceID          string
	RepoRoot             string
	AffectedPaths        []string
	AffectedWidgets      []string
	RequiredCapabilities []string
	ApprovalTier         ApprovalTier
	Mutating             bool
	RequiresAllowedRoots bool
	ChecksIgnoreRules    bool
	HasApproval          bool
	EvaluationProfile    EvaluationProfile
}

type Decision struct {
	Allowed               bool
	RequiresConfirmation  bool
	AutoApproved          bool
	Reason                string
	MissingCapabilities   []string
	EffectiveCapabilities []string
	EffectiveApprovalTier ApprovalTier
	PromptProfileID       string
	RoleID                string
	ModeID                string
	SecurityPosture       string
	MatchedTrustedRuleID  string
	MatchedIgnoreRuleID   string
	IgnoreMode            IgnoreMode
	AllowedRoots          []string
}
