package plugins

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

type ProcessConfig struct {
	Command string
	Args    []string
	Dir     string
	Env     []string
}

type Process interface {
	Stdin() io.WriteCloser
	Stdout() io.ReadCloser
	Wait() error
	Kill() error
}

type ProcessSpawner interface {
	Spawn(ctx context.Context, config ProcessConfig) (Process, error)
}

type OSProcessSpawner struct{}

func (s OSProcessSpawner) Spawn(ctx context.Context, config ProcessConfig) (Process, error) {
	command := strings.TrimSpace(config.Command)
	if command == "" {
		return nil, fmt.Errorf("%w: command is required", ErrInvalidPluginSpec)
	}
	resolvedCommand, err := resolvePluginCommand(command)
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(config.Dir) != "" {
		info, err := os.Stat(config.Dir)
		if err != nil {
			return nil, fmt.Errorf("%w: plugin working directory is invalid: %v", ErrProcessSpawnFailed, err)
		}
		if !info.IsDir() {
			return nil, fmt.Errorf("%w: plugin working directory is not a directory", ErrProcessSpawnFailed)
		}
	}

	cmd := exec.CommandContext(ctx, resolvedCommand, config.Args...)
	cmd.Dir = config.Dir
	if len(config.Env) > 0 {
		cmd.Env = append(os.Environ(), config.Env...)
	}

	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProcessSpawnFailed, err)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProcessSpawnFailed, err)
	}

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("%w: %v", ErrProcessSpawnFailed, err)
	}

	return &execProcess{
		cmd:    cmd,
		stdin:  stdin,
		stdout: stdout,
	}, nil
}

func resolvePluginCommand(command string) (string, error) {
	if strings.ContainsRune(command, filepath.Separator) {
		info, err := os.Stat(command)
		if err != nil {
			if os.IsNotExist(err) {
				return "", fmt.Errorf("%w: plugin command path does not exist: %s", ErrProcessSpawnFailed, command)
			}
			return "", fmt.Errorf("%w: plugin command path is invalid: %v", ErrProcessSpawnFailed, err)
		}
		if info.IsDir() {
			return "", fmt.Errorf("%w: plugin command path is a directory: %s", ErrProcessSpawnFailed, command)
		}
		if info.Mode()&0o111 == 0 {
			return "", fmt.Errorf("%w: plugin command path is not executable: %s", ErrProcessSpawnFailed, command)
		}
		return command, nil
	}

	resolved, err := exec.LookPath(command)
	if err != nil {
		return "", fmt.Errorf("%w: plugin command not found in PATH: %s", ErrProcessSpawnFailed, command)
	}
	return resolved, nil
}

type execProcess struct {
	cmd    *exec.Cmd
	stdin  io.WriteCloser
	stdout io.ReadCloser
}

func (p *execProcess) Stdin() io.WriteCloser {
	return p.stdin
}

func (p *execProcess) Stdout() io.ReadCloser {
	return p.stdout
}

func (p *execProcess) Wait() error {
	return p.cmd.Wait()
}

func (p *execProcess) Kill() error {
	if p.cmd.Process == nil {
		return nil
	}
	return p.cmd.Process.Kill()
}
