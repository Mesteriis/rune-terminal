package app

import (
	"fmt"
	"errors"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"unicode/utf8"
)

var (
	ErrInvalidFSPath          = errors.New("invalid fs path")
	ErrFSPathNotFound         = errors.New("fs path not found")
	ErrFSPathOutsideWorkspace = errors.New("fs path is outside workspace root")
	ErrFSPathNotFile          = errors.New("fs path is not a file")
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

type FSReadResult struct {
	Path             string `json:"path"`
	Preview          string `json:"preview"`
	PreviewAvailable bool   `json:"preview_available"`
	PreviewKind      string `json:"preview_kind,omitempty"`
	Truncated        bool   `json:"truncated"`
}

func (r *Runtime) ListFS(path string) (FSListResult, error) {
	return r.listFS(path, false)
}

func (r *Runtime) ListFSUnbounded(path string) (FSListResult, error) {
	return r.listFS(path, true)
}

func (r *Runtime) listFS(path string, allowOutsideWorkspace bool) (FSListResult, error) {
	normalizedPath, err := r.resolveFSPath(path, allowOutsideWorkspace)
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

func (r *Runtime) resolveFSPath(path string, allowOutsideWorkspace bool) (string, error) {
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
	if allowOutsideWorkspace {
		return targetAbs, nil
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

func (r *Runtime) ReadFSPreview(path string, maxBytes int) (FSReadResult, error) {
	return r.readFSPreview(path, maxBytes, false)
}

func (r *Runtime) ReadFSPreviewUnbounded(path string, maxBytes int) (FSReadResult, error) {
	return r.readFSPreview(path, maxBytes, true)
}

func (r *Runtime) readFSPreview(path string, maxBytes int, allowOutsideWorkspace bool) (FSReadResult, error) {
	targetPath, err := r.resolveFSPath(path, allowOutsideWorkspace)
	if err != nil {
		return FSReadResult{}, err
	}

	info, err := os.Stat(targetPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return FSReadResult{}, ErrFSPathNotFound
		}
		return FSReadResult{}, err
	}
	if info.IsDir() {
		return FSReadResult{}, ErrFSPathNotFile
	}

	limit := int64(maxBytes)
	if limit <= 0 {
		limit = 8192
	}

	file, err := os.Open(targetPath)
	if err != nil {
		return FSReadResult{}, err
	}
	defer file.Close()

	previewBytes, err := io.ReadAll(io.LimitReader(file, limit+1))
	if err != nil {
		return FSReadResult{}, err
	}

	truncated := int64(len(previewBytes)) > limit
	if truncated {
		previewBytes = previewBytes[:limit]
	}

	if hasNULByte(previewBytes) || !utf8.Valid(previewBytes) {
		return FSReadResult{
			Path:             targetPath,
			Preview:          formatHexPreview(previewBytes),
			PreviewAvailable: true,
			PreviewKind:      "hex",
			Truncated:        truncated,
		}, nil
	}

	return FSReadResult{
		Path:             targetPath,
		Preview:          string(previewBytes),
		PreviewAvailable: true,
		PreviewKind:      "text",
		Truncated:        truncated,
	}, nil
}

func hasNULByte(payload []byte) bool {
	for _, b := range payload {
		if b == 0 {
			return true
		}
	}
	return false
}

func formatHexPreview(payload []byte) string {
	if len(payload) == 0 {
		return ""
	}

	var builder strings.Builder
	for offset := 0; offset < len(payload); offset += 16 {
		if offset > 0 {
			builder.WriteByte('\n')
		}

		row := payload[offset:min(offset+16, len(payload))]
		builder.WriteString(fmt.Sprintf("%08x  ", offset))
		for index := 0; index < 16; index++ {
			if index < len(row) {
				builder.WriteString(fmt.Sprintf("%02x", row[index]))
			} else {
				builder.WriteString("  ")
			}
			if index != 15 {
				builder.WriteByte(' ')
			}
		}

		builder.WriteString("  |")
		for _, value := range row {
			if value >= 32 && value <= 126 {
				builder.WriteByte(value)
			} else {
				builder.WriteByte('.')
			}
		}
		builder.WriteByte('|')
	}

	return builder.String()
}
