package app

import (
	"errors"
	"io"
	"os/exec"
	goruntime "runtime"
)

var (
	ErrFSExternalOpenUnsupported = errors.New("fs external open unsupported")
	ErrFSExternalOpenUnavailable = errors.New("fs external open unavailable")
)

type FSOpenResult struct {
	Path string `json:"path"`
}

var openFSExternal = func(path string) error {
	command, args, err := resolveFSExternalOpenCommand(path)
	if err != nil {
		return err
	}

	process := exec.Command(command, args...)
	process.Stdin = nil
	process.Stdout = io.Discard
	process.Stderr = io.Discard
	if err := process.Start(); err != nil {
		if errors.Is(err, exec.ErrNotFound) {
			return ErrFSExternalOpenUnavailable
		}
		return err
	}

	return nil
}

func (r *Runtime) OpenFSExternal(path string) (FSOpenResult, error) {
	targetPath, err := r.resolveFSExistingPath(path)
	if err != nil {
		return FSOpenResult{}, err
	}

	if err := openFSExternal(targetPath); err != nil {
		return FSOpenResult{}, err
	}

	return FSOpenResult{Path: targetPath}, nil
}

func resolveFSExternalOpenCommand(path string) (string, []string, error) {
	switch goruntime.GOOS {
	case "darwin":
		return "open", []string{path}, nil
	case "linux":
		return "xdg-open", []string{path}, nil
	case "windows":
		return "cmd", []string{"/c", "start", "", path}, nil
	default:
		return "", nil, ErrFSExternalOpenUnsupported
	}
}
