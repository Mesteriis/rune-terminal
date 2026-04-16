package plugins

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
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
	if config.Command == "" {
		return nil, fmt.Errorf("%w: command is required", ErrInvalidPluginSpec)
	}

	cmd := exec.CommandContext(ctx, config.Command, config.Args...)
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
