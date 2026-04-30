package atomicfile

import (
	"io"
	"os"
	"path/filepath"
)

// WriteFile replaces path through a same-directory temp file and rename so
// callers never expose a partially written destination file.
func WriteFile(path string, data []byte, perm os.FileMode) error {
	return write(path, perm, func(tempFile *os.File) error {
		_, err := tempFile.Write(data)
		return err
	})
}

// WriteReader streams reader into a same-directory temp file before replacing
// path, preserving atomic replacement behavior without buffering in memory.
func WriteReader(path string, reader io.Reader, perm os.FileMode) error {
	return write(path, perm, func(tempFile *os.File) error {
		_, err := io.Copy(tempFile, reader)
		return err
	})
}

func write(path string, perm os.FileMode, writePayload func(*os.File) error) error {
	dir := filepath.Dir(path)
	tempFile, err := os.CreateTemp(dir, "."+filepath.Base(path)+".tmp-*")
	if err != nil {
		return err
	}
	tempPath := tempFile.Name()
	removeTemp := true
	defer func() {
		if removeTemp {
			_ = os.Remove(tempPath)
		}
	}()

	if err := writePayload(tempFile); err != nil {
		_ = tempFile.Close()
		return err
	}
	if err := tempFile.Chmod(perm); err != nil {
		_ = tempFile.Close()
		return err
	}
	if err := tempFile.Sync(); err != nil {
		_ = tempFile.Close()
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}
	if err := os.Rename(tempPath, path); err != nil {
		return err
	}
	removeTemp = false
	syncDirBestEffort(dir)
	return nil
}

func syncDirBestEffort(dir string) {
	handle, err := os.Open(dir)
	if err != nil {
		return
	}
	defer handle.Close()
	_ = handle.Sync()
}
