package app

import (
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var (
	ErrInvalidFSPath          = errors.New("invalid fs path")
	ErrFSPathNotFound         = errors.New("fs path not found")
	ErrFSPathOutsideWorkspace = errors.New("fs path is outside workspace root")
)

type FSNode struct {
	Name         string `json:"name"`
	Type         string `json:"type"`
	Size         int64  `json:"size,omitempty"`
	ModifiedTime int64  `json:"modified_time,omitempty"`
}

type FSListResult struct {
	Path        string   `json:"path"`
	Directories []FSNode `json:"directories"`
	Files       []FSNode `json:"files"`
}

func (r *Runtime) ListFS(path string) (FSListResult, error) {
	normalizedPath, err := r.resolveFSPath(path)
	if err != nil {
		return FSListResult{}, err
	}

	entries, err := os.ReadDir(normalizedPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FSListResult{}, ErrFSPathNotFound
		}
		return FSListResult{}, err
	}

	result := FSListResult{
		Path:        normalizedPath,
		Directories: make([]FSNode, 0, len(entries)),
		Files:       make([]FSNode, 0, len(entries)),
	}

	for _, entry := range entries {
		info, infoErr := entry.Info()
		if infoErr != nil {
			continue
		}
		modifiedTime := info.ModTime().UTC().Unix()
		if entry.IsDir() {
			result.Directories = append(result.Directories, FSNode{
				Name:         entry.Name(),
				Type:         "directory",
				ModifiedTime: modifiedTime,
			})
			continue
		}
		result.Files = append(result.Files, FSNode{
			Name:         entry.Name(),
			Type:         "file",
			Size:         info.Size(),
			ModifiedTime: modifiedTime,
		})
	}

	sort.Slice(result.Directories, func(i, j int) bool {
		return strings.ToLower(result.Directories[i].Name) < strings.ToLower(result.Directories[j].Name)
	})
	sort.Slice(result.Files, func(i, j int) bool {
		return strings.ToLower(result.Files[i].Name) < strings.ToLower(result.Files[j].Name)
	})

	return result, nil
}

func (r *Runtime) resolveFSPath(path string) (string, error) {
	root := strings.TrimSpace(r.RepoRoot)
	if root == "" {
		return "", ErrInvalidFSPath
	}
	rootAbs, err := filepath.Abs(filepath.Clean(root))
	if err != nil {
		return "", ErrInvalidFSPath
	}

	targetPath := strings.TrimSpace(path)
	if targetPath == "" {
		targetPath = rootAbs
	}
	if !filepath.IsAbs(targetPath) {
		targetPath = filepath.Join(rootAbs, targetPath)
	}

	targetAbs, err := filepath.Abs(filepath.Clean(targetPath))
	if err != nil || targetAbs == "." || targetAbs == "" {
		return "", ErrInvalidFSPath
	}

	relativeToRoot, err := filepath.Rel(rootAbs, targetAbs)
	if err != nil {
		return "", ErrInvalidFSPath
	}
	if relativeToRoot == ".." || strings.HasPrefix(relativeToRoot, ".."+string(os.PathSeparator)) {
		return "", ErrFSPathOutsideWorkspace
	}

	return targetAbs, nil
}
