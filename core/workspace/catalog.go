package workspace

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const catalogSchemaVersion = 1

type Catalog struct {
	ActiveWorkspaceID string     `json:"active_workspace_id"`
	Workspaces        []Snapshot `json:"workspaces"`
}

type persistedCatalog struct {
	Version int     `json:"version"`
	Catalog Catalog `json:"catalog"`
}

type CatalogStore struct {
	mu      sync.RWMutex
	catalog Catalog
}

func BootstrapCatalog(fallback Snapshot) Catalog {
	normalized := normalizeSnapshot(fallback, BootstrapDefault())
	return Catalog{
		ActiveWorkspaceID: normalized.ID,
		Workspaces:        []Snapshot{normalized},
	}
}

func LoadCatalog(path string, fallback Snapshot) (Catalog, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return BootstrapCatalog(fallback), nil
		}
		return Catalog{}, err
	}
	if len(data) == 0 {
		return BootstrapCatalog(fallback), nil
	}

	var persisted persistedCatalog
	if err := json.Unmarshal(data, &persisted); err == nil {
		return normalizeCatalog(persisted.Catalog, fallback), nil
	}

	// Backward-compatible fallback for legacy single-workspace snapshots.
	var single persistedSnapshot
	if err := json.Unmarshal(data, &single); err == nil {
		return BootstrapCatalog(single.Workspace), nil
	}

	var raw Snapshot
	if err := json.Unmarshal(data, &raw); err == nil {
		return BootstrapCatalog(raw), nil
	}

	return Catalog{}, fmt.Errorf("invalid workspace catalog payload")
}

func SaveCatalog(path string, catalog Catalog) error {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	payload, err := json.MarshalIndent(persistedCatalog{
		Version: catalogSchemaVersion,
		Catalog: catalog,
	}, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, payload, 0o600)
}

func NewCatalogStore(catalog Catalog) *CatalogStore {
	return &CatalogStore{catalog: normalizeCatalog(catalog, BootstrapDefault())}
}

func (s *CatalogStore) Snapshot() Catalog {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneCatalog(s.catalog)
}

func (s *CatalogStore) ActiveSnapshot() Snapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snapshot, ok := findWorkspaceSnapshot(s.catalog.Workspaces, s.catalog.ActiveWorkspaceID)
	if ok {
		return cloneSnapshot(snapshot)
	}
	fallback := BootstrapDefault()
	return cloneSnapshot(fallback)
}

func (s *CatalogStore) SetActiveSnapshot(snapshot Snapshot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	normalized := normalizeSnapshot(snapshot, BootstrapDefault())
	s.catalog = upsertCatalogSnapshot(s.catalog, normalized)
}

func (s *CatalogStore) SwitchActive(workspaceID string) (Snapshot, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	workspaceID = strings.TrimSpace(workspaceID)
	snapshot, ok := findWorkspaceSnapshot(s.catalog.Workspaces, workspaceID)
	if !ok {
		return Snapshot{}, fmt.Errorf("%w: %s", ErrWorkspaceNotFound, workspaceID)
	}
	s.catalog.ActiveWorkspaceID = workspaceID
	return cloneSnapshot(snapshot), nil
}

func (s *CatalogStore) Upsert(snapshot Snapshot) Snapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	normalized := normalizeSnapshot(snapshot, BootstrapDefault())
	s.catalog = upsertCatalogSnapshot(s.catalog, normalized)
	return cloneSnapshot(normalized)
}

func (s *CatalogStore) Get(workspaceID string) (Snapshot, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	snapshot, ok := findWorkspaceSnapshot(s.catalog.Workspaces, workspaceID)
	if !ok {
		return Snapshot{}, false
	}
	return cloneSnapshot(snapshot), true
}

func (s *CatalogStore) ListEntries(windowID string) []ListEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return listEntriesForCatalog(s.catalog, windowID)
}

func (s *CatalogStore) Delete(workspaceID string) (Catalog, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	workspaceID = strings.TrimSpace(workspaceID)
	nextWorkspaces := make([]Snapshot, 0, len(s.catalog.Workspaces))
	found := false
	for _, candidate := range s.catalog.Workspaces {
		if candidate.ID == workspaceID {
			found = true
			continue
		}
		nextWorkspaces = append(nextWorkspaces, cloneSnapshot(candidate))
	}
	if !found {
		return Catalog{}, fmt.Errorf("%w: %s", ErrWorkspaceNotFound, workspaceID)
	}
	if len(nextWorkspaces) == 0 {
		fallback := normalizeSnapshot(BootstrapDefault(), BootstrapDefault())
		nextWorkspaces = append(nextWorkspaces, fallback)
		s.catalog.ActiveWorkspaceID = fallback.ID
	} else if s.catalog.ActiveWorkspaceID == workspaceID {
		s.catalog.ActiveWorkspaceID = nextWorkspaces[0].ID
	}
	s.catalog.Workspaces = nextWorkspaces
	return cloneCatalog(s.catalog), nil
}

func normalizeCatalog(candidate Catalog, fallback Snapshot) Catalog {
	normalized := Catalog{
		ActiveWorkspaceID: strings.TrimSpace(candidate.ActiveWorkspaceID),
	}
	seen := make(map[string]struct{}, len(candidate.Workspaces))
	for _, snapshot := range candidate.Workspaces {
		normalizedSnapshot := normalizeSnapshot(snapshot, fallback)
		if normalizedSnapshot.ID == "" {
			continue
		}
		if _, ok := seen[normalizedSnapshot.ID]; ok {
			continue
		}
		seen[normalizedSnapshot.ID] = struct{}{}
		normalized.Workspaces = append(normalized.Workspaces, normalizedSnapshot)
	}
	if len(normalized.Workspaces) == 0 {
		return BootstrapCatalog(fallback)
	}
	if normalized.ActiveWorkspaceID == "" {
		normalized.ActiveWorkspaceID = normalized.Workspaces[0].ID
	}
	if _, ok := findWorkspaceSnapshot(normalized.Workspaces, normalized.ActiveWorkspaceID); !ok {
		normalized.ActiveWorkspaceID = normalized.Workspaces[0].ID
	}
	return normalized
}

func listEntriesForCatalog(catalog Catalog, windowID string) []ListEntry {
	entries := make([]ListEntry, 0, len(catalog.Workspaces))
	for _, snapshot := range catalog.Workspaces {
		if strings.TrimSpace(snapshot.Name) == "" || strings.TrimSpace(snapshot.Icon) == "" || strings.TrimSpace(snapshot.Color) == "" {
			continue
		}
		entryWindowID := ""
		if snapshot.ID == catalog.ActiveWorkspaceID {
			entryWindowID = windowID
		}
		entries = append(entries, ListEntry{
			WindowID:  entryWindowID,
			Workspace: summaryFromSnapshot(snapshot),
		})
	}
	return entries
}

func summaryFromSnapshot(snapshot Snapshot) Summary {
	return Summary{
		OID:   snapshot.ID,
		Name:  strings.TrimSpace(snapshot.Name),
		Icon:  strings.TrimSpace(snapshot.Icon),
		Color: strings.TrimSpace(snapshot.Color),
	}
}

func cloneCatalog(catalog Catalog) Catalog {
	cloned := Catalog{
		ActiveWorkspaceID: catalog.ActiveWorkspaceID,
		Workspaces:        make([]Snapshot, 0, len(catalog.Workspaces)),
	}
	for _, snapshot := range catalog.Workspaces {
		cloned.Workspaces = append(cloned.Workspaces, cloneSnapshot(snapshot))
	}
	return cloned
}

func upsertCatalogSnapshot(catalog Catalog, snapshot Snapshot) Catalog {
	next := cloneCatalog(catalog)
	replaced := false
	for i := range next.Workspaces {
		if next.Workspaces[i].ID != snapshot.ID {
			continue
		}
		next.Workspaces[i] = cloneSnapshot(snapshot)
		replaced = true
		break
	}
	if !replaced {
		next.Workspaces = append(next.Workspaces, cloneSnapshot(snapshot))
	}
	if strings.TrimSpace(next.ActiveWorkspaceID) == "" {
		next.ActiveWorkspaceID = snapshot.ID
	}
	return normalizeCatalog(next, BootstrapDefault())
}

func findWorkspaceSnapshot(workspaces []Snapshot, workspaceID string) (Snapshot, bool) {
	workspaceID = strings.TrimSpace(workspaceID)
	for _, candidate := range workspaces {
		if candidate.ID == workspaceID {
			return candidate, true
		}
	}
	return Snapshot{}, false
}
