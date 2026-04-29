package app

import (
	"errors"
	"io"
	"os"
	"unicode/utf8"
)

const maxFSFileContentBytes = 1024 * 1024

var (
	ErrFSPathNotText  = errors.New("fs path is not a text file")
	ErrFSPathTooLarge = errors.New("fs file is too large")
)

type FSFileResult struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

func (r *Runtime) ReadFSFile(path string) (FSFileResult, error) {
	targetPath, err := r.resolveFSPath(path, false)
	if err != nil {
		return FSFileResult{}, err
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FSFileResult{}, ErrFSPathNotFound
		}
		return FSFileResult{}, err
	}
	if info.IsDir() {
		return FSFileResult{}, ErrFSPathNotFile
	}
	if info.Size() > maxFSFileContentBytes {
		return FSFileResult{}, ErrFSPathTooLarge
	}

	content, err := readFSTextContent(targetPath)
	if err != nil {
		return FSFileResult{}, err
	}

	return FSFileResult{
		Path:    targetPath,
		Content: content,
	}, nil
}

func (r *Runtime) WriteFSFile(path string, content string) (FSFileResult, error) {
	if len([]byte(content)) > maxFSFileContentBytes {
		return FSFileResult{}, ErrFSPathTooLarge
	}

	targetPath, err := r.resolveFSExistingPath(path)
	if err != nil {
		return FSFileResult{}, err
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FSFileResult{}, ErrFSPathNotFound
		}
		return FSFileResult{}, err
	}
	if info.IsDir() {
		return FSFileResult{}, ErrFSPathNotFile
	}

	if _, err := readFSTextContent(targetPath); err != nil {
		return FSFileResult{}, err
	}

	if err := os.WriteFile(targetPath, []byte(content), info.Mode().Perm()); err != nil {
		return FSFileResult{}, err
	}

	return FSFileResult{
		Path:    targetPath,
		Content: content,
	}, nil
}

func readFSTextContent(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", ErrFSPathNotFound
		}
		return "", err
	}
	defer file.Close()

	payload, err := io.ReadAll(io.LimitReader(file, maxFSFileContentBytes+1))
	if err != nil {
		return "", err
	}
	if len(payload) > maxFSFileContentBytes {
		return "", ErrFSPathTooLarge
	}

	if hasNULByte(payload) || !utf8.Valid(payload) {
		return "", ErrFSPathNotText
	}

	return string(payload), nil
}
