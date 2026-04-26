package app

import (
	"os"
	osuser "os/user"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/agent"
)

func (r *Runtime) currentProviderActor() agent.ProviderActor {
	if user, err := osuser.Current(); err == nil {
		return agent.ProviderActor{
			Username: strings.TrimSpace(user.Username),
			HomeDir:  strings.TrimSpace(user.HomeDir),
		}
	}

	username := strings.TrimSpace(firstNonEmpty(os.Getenv("USER"), os.Getenv("USERNAME")))
	if username == "" {
		username = "unknown"
	}
	return agent.ProviderActor{
		Username: username,
		HomeDir:  strings.TrimSpace(r.HomeDir),
	}
}
