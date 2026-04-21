package agent

import "fmt"

func (s *Store) Provider(id string) (ProviderRecord, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	provider, ok := findByID(s.data.Providers, id)
	if !ok {
		return ProviderRecord{}, fmt.Errorf("%w: %s", ErrProviderNotFound, id)
	}
	return cloneProviderRecord(provider), nil
}
