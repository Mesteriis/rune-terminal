package workspace

import "testing"

func TestWidgetKindCatalogIsStableAndHonest(t *testing.T) {
	t.Parallel()

	catalog := WidgetKindCatalog()
	expectedKinds := []WidgetKind{
		WidgetKindTerminal,
		WidgetKindFiles,
		WidgetKindCommander,
		WidgetKindPreview,
		WidgetKindEditor,
		WidgetKindWeb,
	}
	if len(catalog) != len(expectedKinds) {
		t.Fatalf("expected %d widget kinds, got %#v", len(expectedKinds), catalog)
	}

	seen := make(map[WidgetKind]struct{}, len(catalog))
	for index, expectedKind := range expectedKinds {
		entry := catalog[index]
		if entry.Kind != expectedKind {
			t.Fatalf("unexpected kind at index %d: %#v", index, catalog)
		}
		if entry.Label == "" || entry.Description == "" || entry.DefaultTitle == "" {
			t.Fatalf("catalog entry must be operator-readable: %#v", entry)
		}
		if _, exists := seen[entry.Kind]; exists {
			t.Fatalf("duplicate widget kind in catalog: %s", entry.Kind)
		}
		seen[entry.Kind] = struct{}{}
	}

	terminal := catalog[0]
	if terminal.Status != WidgetKindStatusAvailable || !terminal.RuntimeOwned || !terminal.CanCreate {
		t.Fatalf("terminal must remain an available backend-owned creatable widget kind: %#v", terminal)
	}

	commander := catalog[2]
	if commander.Status != WidgetKindStatusFrontendLocal || commander.RuntimeOwned || commander.CanCreate {
		t.Fatalf("commander must not be overclaimed as backend-owned yet: %#v", commander)
	}

	for _, entry := range catalog[3:] {
		if entry.Status != WidgetKindStatusPlanned || entry.RuntimeOwned || entry.CanCreate {
			t.Fatalf("future widget kind must remain planned until implemented: %#v", entry)
		}
	}
}

func TestWidgetKindCatalogReturnsCopy(t *testing.T) {
	t.Parallel()

	catalog := WidgetKindCatalog()
	catalog[0].Kind = "mutated"

	if WidgetKindCatalog()[0].Kind != WidgetKindTerminal {
		t.Fatalf("catalog mutation leaked into shared state")
	}
}
