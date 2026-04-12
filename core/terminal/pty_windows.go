//go:build windows

package terminal

import (
	"context"
	"errors"
)

type unsupportedLauncher struct{}

func DefaultLauncher() Launcher {
	return unsupportedLauncher{}
}

func DefaultShell() string {
	return "cmd.exe"
}

func (unsupportedLauncher) Launch(context.Context, LaunchOptions) (Process, error) {
	return nil, errors.New("Windows terminal launcher is not implemented in the MVP")
}
