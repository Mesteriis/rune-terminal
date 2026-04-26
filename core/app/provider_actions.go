package app

import (
	"context"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func (r *Runtime) ProviderCatalog() agent.ProviderCatalog {
	return r.Agent.ProvidersCatalogWithActor(r.currentProviderActor())
}

func (r *Runtime) CreateProvider(input agent.CreateProviderInput) (agent.ProviderView, agent.ProviderCatalog, error) {
	return r.Agent.CreateProviderWithActor(input, r.currentProviderActor())
}

func (r *Runtime) UpdateProvider(id string, input agent.UpdateProviderInput) (agent.ProviderView, agent.ProviderCatalog, error) {
	return r.Agent.UpdateProviderWithActor(id, input, r.currentProviderActor())
}

func (r *Runtime) SetActiveProvider(id string) (agent.ProviderCatalog, error) {
	if err := r.Agent.SetActiveProviderWithActor(id, r.currentProviderActor()); err != nil {
		return agent.ProviderCatalog{}, err
	}
	record, recordErr := r.Agent.Provider(id)
	if recordErr == nil && record.RoutePolicy.PrewarmPolicy == agent.ProviderPrewarmPolicyOnActivate {
		_, _ = r.PrewarmProvider(context.Background(), id)
	}
	return r.Agent.ProvidersCatalogWithActor(r.currentProviderActor()), nil
}

func (r *Runtime) DeleteProvider(id string) (agent.ProviderCatalog, error) {
	return r.Agent.DeleteProviderWithActor(id, r.currentProviderActor())
}
