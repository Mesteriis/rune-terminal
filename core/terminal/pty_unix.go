//go:build darwin || linux

package terminal

import (
	"context"
	"errors"
	"io"
	"os"
	"os/exec"
	"strconv"
	"sync"

	"github.com/creack/pty/v2"
)

type PTYLauncher struct{}

var resolveExecutable = exec.LookPath

type ptyProcess struct {
	cmd       *exec.Cmd
	ptmx      *os.File
	outputCh  chan []byte
	closeOnce sync.Once
}

func DefaultLauncher() Launcher {
	return PTYLauncher{}
}

func DefaultShell() string {
	if shell := os.Getenv("SHELL"); shell != "" {
		return shell
	}
	for _, candidate := range []string{"/bin/zsh", "/bin/bash", "/bin/sh"} {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return "/bin/sh"
}

func (PTYLauncher) Launch(ctx context.Context, opts LaunchOptions) (Process, error) {
	cmd, err := buildCommand(ctx, opts)
	if err != nil {
		return nil, err
	}

	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{Rows: 30, Cols: 120})
	if err != nil {
		return nil, err
	}

	process := &ptyProcess{
		cmd:      cmd,
		ptmx:     ptmx,
		outputCh: make(chan []byte, 64),
	}
	go process.readLoop()
	return process, nil
}

func buildCommand(ctx context.Context, opts LaunchOptions) (*exec.Cmd, error) {
	var cmd *exec.Cmd
	switch opts.Connection.Kind {
	case "", "local":
		shell := opts.Shell
		if shell == "" {
			shell = DefaultShell()
		}
		if _, err := os.Stat(shell); err != nil {
			return nil, err
		}
		cmd = exec.CommandContext(ctx, shell, "-l")
		if opts.WorkingDir != "" {
			cmd.Dir = opts.WorkingDir
		}
	case "ssh":
		sshPath, args, err := buildSSHCommandArgs(opts.Connection.SSH)
		if err != nil {
			return nil, err
		}
		cmd = exec.CommandContext(ctx, sshPath, args...)
	default:
		return nil, errors.New("unsupported connection kind")
	}

	cmd.Env = append(os.Environ(), "TERM=xterm-256color", "COLORTERM=truecolor")
	return cmd, nil
}

func buildSSHCommandArgs(config *SSHConfig) (string, []string, error) {
	if config == nil {
		return "", nil, errors.New("ssh connection is missing config")
	}
	if config.Host == "" {
		return "", nil, errors.New("ssh connection host is required")
	}
	sshPath, err := resolveExecutable("ssh")
	if err != nil {
		return "", nil, errors.New("ssh binary is not available on this machine")
	}

	args := make([]string, 0, 8)
	args = append(
		args,
		"-o", "BatchMode=yes",
		"-o", "ConnectTimeout=5",
		"-o", "StrictHostKeyChecking=accept-new",
	)
	if config.Port > 0 {
		args = append(args, "-p", strconv.Itoa(config.Port))
	}
	if config.IdentityFile != "" {
		args = append(args, "-i", config.IdentityFile)
	}
	target := config.Host
	if config.User != "" {
		target = config.User + "@" + target
	}
	args = append(args, target)
	return sshPath, args, nil
}

func (p *ptyProcess) readLoop() {
	defer close(p.outputCh)

	buffer := make([]byte, 4096)
	for {
		n, err := p.ptmx.Read(buffer)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buffer[:n])
			p.outputCh <- chunk
		}
		if err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			return
		}
	}
}

func (p *ptyProcess) PID() int {
	if p.cmd.Process == nil {
		return 0
	}
	return p.cmd.Process.Pid
}

func (p *ptyProcess) Write(data []byte) (int, error) {
	return p.ptmx.Write(data)
}

func (p *ptyProcess) Output() <-chan []byte {
	return p.outputCh
}

func (p *ptyProcess) Wait() (int, error) {
	err := p.cmd.Wait()
	if p.cmd.ProcessState != nil {
		return p.cmd.ProcessState.ExitCode(), nil
	}
	if err != nil {
		return 1, err
	}
	return 0, nil
}

func (p *ptyProcess) Signal(sig os.Signal) error {
	if p.cmd.Process == nil {
		return errors.New("process not started")
	}
	return p.cmd.Process.Signal(sig)
}

func (p *ptyProcess) Close() error {
	var closeErr error
	p.closeOnce.Do(func() {
		closeErr = p.ptmx.Close()
		if p.cmd.Process != nil {
			_ = p.cmd.Process.Kill()
		}
	})
	return closeErr
}
