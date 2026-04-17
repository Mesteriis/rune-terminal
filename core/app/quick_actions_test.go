package app

import "testing"

func TestListQuickActionsReturnsCatalogCopy(t *testing.T) {
	t.Parallel()

	actions := ListQuickActions()
	if len(actions) == 0 {
		t.Fatalf("expected non-empty quick-action catalog")
	}

	actions[0].Label = "mutated"
	fresh := ListQuickActions()
	if fresh[0].Label == "mutated" {
		t.Fatalf("expected catalog copy, mutation leaked")
	}
}

func TestListQuickActionsCatalogIsTypedAndExplicit(t *testing.T) {
	t.Parallel()

	actions := ListQuickActions()
	seen := make(map[string]struct{}, len(actions))
	for _, action := range actions {
		if action.ID == "" {
			t.Fatalf("quick action must have id: %#v", action)
		}
		if action.Label == "" {
			t.Fatalf("quick action must have label: %#v", action)
		}
		if action.Category == "" {
			t.Fatalf("quick action must have category: %#v", action)
		}
		if action.TargetKind == "" {
			t.Fatalf("quick action must have target kind: %#v", action)
		}
		if action.InvocationPath == "" {
			t.Fatalf("quick action must have invocation path: %#v", action)
		}
		if action.ExecutionKind != QuickActionUIOnly && action.ExecutionKind != QuickActionExecutionBearing {
			t.Fatalf("quick action must have known execution kind: %#v", action)
		}
		if action.RequiresExplicitContext && action.ContextRequirement == "" {
			t.Fatalf("quick action requiring context must declare requirement: %#v", action)
		}
		if _, exists := seen[action.ID]; exists {
			t.Fatalf("quick action id must be unique: %q", action.ID)
		}
		seen[action.ID] = struct{}{}
	}
}
