package app

import (
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var (
	ErrFSPathExists       = errors.New("fs path already exists")
	ErrFSPathNotDirectory = errors.New("fs path is not a directory")
	ErrInvalidFSName      = errors.New("invalid fs entry name")
	ErrInvalidFSTarget    = errors.New("invalid fs target path")
)

type FSMkdirResult struct {
	Path string `json:"path"`
}

type FSPathsResult struct {
	Paths []string `json:"paths"`
}

type FSCopyEntry struct {
	SourcePath string `json:"source_path"`
	TargetPath string `json:"target_path"`
}

type FSRenameEntry struct {
	Path     string `json:"path"`
	NextName string `json:"next_name"`
}

func (r *Runtime) MkdirFS(path string) (FSMkdirResult, error) {
	targetInput := strings.TrimSpace(path)
	if targetInput == "" {
		return FSMkdirResult{}, ErrInvalidFSPath
	}

	targetPath, err := r.resolveFSPath(targetInput, false)
	if err != nil {
		return FSMkdirResult{}, err
	}

	if err := ensureFSParentDirectory(targetPath); err != nil {
		return FSMkdirResult{}, err
	}

	if _, err := os.Stat(targetPath); err == nil {
		return FSMkdirResult{}, ErrFSPathExists
	} else if !errors.Is(err, os.ErrNotExist) {
		return FSMkdirResult{}, err
	}

	if err := os.Mkdir(targetPath, 0o755); err != nil {
		if errors.Is(err, os.ErrExist) {
			return FSMkdirResult{}, ErrFSPathExists
		}
		if errors.Is(err, os.ErrNotExist) {
			return FSMkdirResult{}, ErrFSPathNotFound
		}
		return FSMkdirResult{}, err
	}

	return FSMkdirResult{Path: targetPath}, nil
}

func (r *Runtime) CopyFS(sourcePaths []string, targetPath string, overwrite bool) (FSPathsResult, error) {
	normalizedSourcePaths, err := r.resolveFSPaths(sourcePaths)
	if err != nil {
		return FSPathsResult{}, err
	}
	normalizedTargetPath, err := r.resolveFSDirectory(targetPath)
	if err != nil {
		return FSPathsResult{}, err
	}

	targetPaths, err := prepareFSTargetPaths(normalizedSourcePaths, normalizedTargetPath)
	if err != nil {
		return FSPathsResult{}, err
	}
	return copyFSResolvedPaths(normalizedSourcePaths, targetPaths, overwrite)
}

func (r *Runtime) CopyFSEntries(entries []FSCopyEntry, overwrite bool) (FSPathsResult, error) {
	if len(entries) == 0 {
		return FSPathsResult{}, ErrInvalidFSPath
	}

	sourcePaths := make([]string, 0, len(entries))
	targetPaths := make([]string, 0, len(entries))
	targetPathSet := make(map[string]struct{}, len(entries))

	for _, entry := range entries {
		sourcePath, err := r.resolveFSExistingEntryPath(entry.SourcePath)
		if err != nil {
			return FSPathsResult{}, err
		}

		targetInput := strings.TrimSpace(entry.TargetPath)
		if targetInput == "" {
			return FSPathsResult{}, ErrInvalidFSTarget
		}

		targetPath, err := r.resolveFSPath(targetInput, false)
		if err != nil {
			return FSPathsResult{}, err
		}
		if err := ensureFSParentDirectory(targetPath); err != nil {
			return FSPathsResult{}, err
		}
		if _, exists := targetPathSet[targetPath]; exists {
			return FSPathsResult{}, ErrFSPathExists
		}

		sourcePaths = append(sourcePaths, sourcePath)
		targetPaths = append(targetPaths, targetPath)
		targetPathSet[targetPath] = struct{}{}
	}

	return copyFSResolvedPaths(sourcePaths, targetPaths, overwrite)
}

func (r *Runtime) MoveFS(sourcePaths []string, targetPath string, overwrite bool) (FSPathsResult, error) {
	normalizedSourcePaths, err := r.resolveFSPaths(sourcePaths)
	if err != nil {
		return FSPathsResult{}, err
	}
	normalizedTargetPath, err := r.resolveFSDirectory(targetPath)
	if err != nil {
		return FSPathsResult{}, err
	}

	targetPaths, err := prepareFSTargetPaths(normalizedSourcePaths, normalizedTargetPath)
	if err != nil {
		return FSPathsResult{}, err
	}
	if err := validateFSOverwriteTargets(targetPaths, overwrite); err != nil {
		return FSPathsResult{}, err
	}
	for index, sourcePath := range normalizedSourcePaths {
		if err := validateFSTargetPath(sourcePath, targetPaths[index]); err != nil {
			return FSPathsResult{}, err
		}
	}

	for index, sourcePath := range normalizedSourcePaths {
		targetEntryPath := targetPaths[index]
		if overwrite {
			if err := removeFSPath(targetEntryPath); err != nil {
				return FSPathsResult{}, err
			}
		}
		if err := moveFSPath(sourcePath, targetEntryPath); err != nil {
			return FSPathsResult{}, err
		}
	}

	return FSPathsResult{Paths: targetPaths}, nil
}

func (r *Runtime) DeleteFS(paths []string) (FSPathsResult, error) {
	normalizedPaths, err := r.resolveFSPaths(paths)
	if err != nil {
		return FSPathsResult{}, err
	}

	for _, path := range normalizedPaths {
		if err := removeFSPath(path); err != nil {
			return FSPathsResult{}, err
		}
	}

	return FSPathsResult{Paths: normalizedPaths}, nil
}

func (r *Runtime) RenameFS(entries []FSRenameEntry, overwrite bool) (FSPathsResult, error) {
	if len(entries) == 0 {
		return FSPathsResult{}, ErrInvalidFSPath
	}

	type plannedRename struct {
		sourcePath string
		targetPath string
	}

	plannedRenames := make([]plannedRename, 0, len(entries))
	targetPathSet := make(map[string]struct{}, len(entries))
	sourcePathSet := make(map[string]struct{}, len(entries))

	for _, entry := range entries {
		sourcePath, err := r.resolveFSExistingEntryPath(entry.Path)
		if err != nil {
			return FSPathsResult{}, err
		}
		nextName, err := normalizeFSName(entry.NextName)
		if err != nil {
			return FSPathsResult{}, err
		}
		targetPath := filepath.Join(filepath.Dir(sourcePath), nextName)
		targetPath, err = r.resolveFSPath(targetPath, false)
		if err != nil {
			return FSPathsResult{}, err
		}

		if _, exists := targetPathSet[targetPath]; exists {
			return FSPathsResult{}, ErrFSPathExists
		}

		plannedRenames = append(plannedRenames, plannedRename{
			sourcePath: sourcePath,
			targetPath: targetPath,
		})
		targetPathSet[targetPath] = struct{}{}
		sourcePathSet[sourcePath] = struct{}{}
	}

	for _, entry := range plannedRenames {
		if entry.sourcePath == entry.targetPath {
			continue
		}
		if _, err := os.Lstat(entry.targetPath); err == nil {
			if _, isSourcePath := sourcePathSet[entry.targetPath]; !isSourcePath && !overwrite {
				return FSPathsResult{}, ErrFSPathExists
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			return FSPathsResult{}, err
		}
	}

	type stagedRename struct {
		tempPath   string
		targetPath string
	}

	stagedRenames := make([]stagedRename, 0, len(plannedRenames))
	for index, entry := range plannedRenames {
		if entry.sourcePath == entry.targetPath {
			continue
		}
		tempPath := filepath.Join(
			filepath.Dir(entry.sourcePath),
			generateTempFSName(filepath.Base(entry.sourcePath), index),
		)
		if err := moveFSPath(entry.sourcePath, tempPath); err != nil {
			return FSPathsResult{}, err
		}
		stagedRenames = append(stagedRenames, stagedRename{
			tempPath:   tempPath,
			targetPath: entry.targetPath,
		})
	}

	for _, stagedRename := range stagedRenames {
		if overwrite {
			if err := removeFSPath(stagedRename.targetPath); err != nil {
				return FSPathsResult{}, err
			}
		}
		if err := moveFSPath(stagedRename.tempPath, stagedRename.targetPath); err != nil {
			return FSPathsResult{}, err
		}
	}

	resultPaths := make([]string, 0, len(plannedRenames))
	for _, entry := range plannedRenames {
		resultPaths = append(resultPaths, entry.targetPath)
	}

	return FSPathsResult{Paths: resultPaths}, nil
}

func (r *Runtime) resolveFSDirectory(path string) (string, error) {
	resolvedPath, err := r.resolveFSExistingPath(path)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(resolvedPath)
	if err != nil {
		return "", err
	}
	if !info.IsDir() {
		return "", ErrFSPathNotDirectory
	}
	return resolvedPath, nil
}

func (r *Runtime) resolveFSExistingPath(path string) (string, error) {
	resolvedPath, err := r.resolveFSPath(path, false)
	if err != nil {
		return "", err
	}
	if _, err := os.Stat(resolvedPath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", ErrFSPathNotFound
		}
		return "", err
	}
	return resolvedPath, nil
}

func (r *Runtime) resolveFSExistingEntryPath(path string) (string, error) {
	resolvedPath, err := r.resolveFSEntryPath(path)
	if err != nil {
		return "", err
	}
	if _, err := os.Lstat(resolvedPath); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", ErrFSPathNotFound
		}
		return "", err
	}
	return resolvedPath, nil
}

func (r *Runtime) resolveFSPaths(paths []string) ([]string, error) {
	if len(paths) == 0 {
		return nil, ErrInvalidFSPath
	}

	normalizedPaths := make([]string, 0, len(paths))
	for _, path := range paths {
		normalizedPath, err := r.resolveFSExistingEntryPath(path)
		if err != nil {
			return nil, err
		}
		normalizedPaths = append(normalizedPaths, normalizedPath)
	}

	return normalizedPaths, nil
}

func ensureFSParentDirectory(path string) error {
	parentPath := filepath.Dir(path)
	parentInfo, err := os.Stat(parentPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrFSPathNotFound
		}
		return err
	}
	if !parentInfo.IsDir() {
		return ErrFSPathNotDirectory
	}
	return nil
}

func normalizeFSName(name string) (string, error) {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" || trimmedName == "." || trimmedName == ".." {
		return "", ErrInvalidFSName
	}
	if strings.Contains(trimmedName, "/") || strings.Contains(trimmedName, string(os.PathSeparator)) {
		return "", ErrInvalidFSName
	}
	return trimmedName, nil
}

func prepareFSTargetPaths(sourcePaths []string, targetPath string) ([]string, error) {
	targetPaths := make([]string, 0, len(sourcePaths))
	targetPathSet := make(map[string]struct{}, len(sourcePaths))

	for _, sourcePath := range sourcePaths {
		targetEntryPath := filepath.Join(targetPath, filepath.Base(sourcePath))
		if _, exists := targetPathSet[targetEntryPath]; exists {
			return nil, ErrFSPathExists
		}
		targetPaths = append(targetPaths, targetEntryPath)
		targetPathSet[targetEntryPath] = struct{}{}
	}

	return targetPaths, nil
}

func copyFSResolvedPaths(sourcePaths []string, targetPaths []string, overwrite bool) (FSPathsResult, error) {
	if len(sourcePaths) == 0 || len(sourcePaths) != len(targetPaths) {
		return FSPathsResult{}, ErrInvalidFSPath
	}

	if err := validateFSOverwriteTargets(targetPaths, overwrite); err != nil {
		return FSPathsResult{}, err
	}
	for index, sourcePath := range sourcePaths {
		if err := validateFSTargetPath(sourcePath, targetPaths[index]); err != nil {
			return FSPathsResult{}, err
		}
	}

	for index, sourcePath := range sourcePaths {
		targetEntryPath := targetPaths[index]
		if overwrite {
			if err := removeFSPath(targetEntryPath); err != nil {
				return FSPathsResult{}, err
			}
		}
		if err := copyFSPath(sourcePath, targetEntryPath); err != nil {
			return FSPathsResult{}, err
		}
	}

	return FSPathsResult{Paths: append([]string(nil), targetPaths...)}, nil
}

func validateFSOverwriteTargets(targetPaths []string, overwrite bool) error {
	for _, targetPath := range targetPaths {
		if _, err := os.Lstat(targetPath); err == nil {
			if !overwrite {
				return ErrFSPathExists
			}
		} else if !errors.Is(err, os.ErrNotExist) {
			return err
		}
	}

	return nil
}

func validateFSTargetPath(sourcePath string, targetPath string) error {
	if sourcePath == targetPath {
		return ErrInvalidFSTarget
	}

	sourceInfo, err := os.Lstat(sourcePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrFSPathNotFound
		}
		return err
	}
	if !sourceInfo.IsDir() {
		return nil
	}
	if targetPath == sourcePath || strings.HasPrefix(targetPath, sourcePath+string(os.PathSeparator)) {
		return ErrInvalidFSTarget
	}
	return nil
}

func removeFSPath(path string) error {
	if _, err := os.Lstat(path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil
		}
		return err
	}
	return os.RemoveAll(path)
}

func copyFSPath(sourcePath string, targetPath string) error {
	sourceInfo, err := os.Lstat(sourcePath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return ErrFSPathNotFound
		}
		return err
	}

	if sourceInfo.Mode()&os.ModeSymlink != 0 {
		linkTarget, err := os.Readlink(sourcePath)
		if err != nil {
			return err
		}
		return os.Symlink(linkTarget, targetPath)
	}

	if sourceInfo.IsDir() {
		if err := os.MkdirAll(targetPath, sourceInfo.Mode().Perm()); err != nil {
			return err
		}
		entries, err := os.ReadDir(sourcePath)
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if err := copyFSPath(
				filepath.Join(sourcePath, entry.Name()),
				filepath.Join(targetPath, entry.Name()),
			); err != nil {
				return err
			}
		}
		return nil
	}

	return copyFSFile(sourcePath, targetPath, sourceInfo.Mode().Perm())
}

func copyFSFile(sourcePath string, targetPath string, mode fs.FileMode) error {
	sourceFile, err := os.Open(sourcePath)
	if err != nil {
		return err
	}
	defer sourceFile.Close()

	targetFile, err := os.OpenFile(targetPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode)
	if err != nil {
		return err
	}
	defer targetFile.Close()

	if _, err := io.Copy(targetFile, sourceFile); err != nil {
		return err
	}

	return nil
}

func moveFSPath(sourcePath string, targetPath string) error {
	if err := os.Rename(sourcePath, targetPath); err == nil {
		return nil
	} else if !errors.Is(err, os.ErrInvalid) && !isCrossDeviceRenameError(err) {
		return err
	}

	if err := copyFSPath(sourcePath, targetPath); err != nil {
		return err
	}

	return os.RemoveAll(sourcePath)
}

func isCrossDeviceRenameError(err error) bool {
	if err == nil {
		return false
	}

	return strings.Contains(strings.ToLower(err.Error()), "cross-device")
}

func generateTempFSName(baseName string, index int) string {
	return "." + baseName + ".rterm-rename-" + strconv.FormatInt(time.Now().UTC().UnixNano(), 10) + "-" + strconv.Itoa(index+1)
}
