package app

import "github.com/Mesteriis/rune-terminal/core/agent"

func (r *Runtime) ProviderCatalog() agent.ProviderCatalog {
	return r.Agent.ProvidersCatalog()
}

func (r *Runtime) CreateProvider(input agent.CreateProviderInput) (agent.ProviderView, agent.ProviderCatalog, error) {
	return r.Agent.CreateProvider(input)
}

func (r *Runtime) UpdateProvider(id string, input agent.UpdateProviderInput) (agent.ProviderView, agent.ProviderCatalog, error) {
	return r.Agent.UpdateProvider(id, input)
}

func (r *Runtime) SetActiveProvider(id string) (agent.ProviderCatalog, error) {
	if err := r.Agent.SetActiveProvider(id); err != nil {
		return agent.ProviderCatalog{}, err
	}
	return r.Agent.ProvidersCatalog(), nil
}

func (r *Runtime) DeleteProvider(id string) (agent.ProviderCatalog, error) {
	return r.Agent.DeleteProvider(id)
}
