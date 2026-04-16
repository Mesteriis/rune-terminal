package app

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

func validateAttachmentReferences(attachments []conversation.AttachmentReference) error {
	for _, attachment := range attachments {
		path := strings.TrimSpace(attachment.Path)
		if path == "" {
			return conversation.ErrInvalidAttachmentPath
		}
		normalizedPath := filepath.Clean(path)
		if normalizedPath == "." || !filepath.IsAbs(normalizedPath) {
			return conversation.ErrInvalidAttachmentPath
		}

		info, err := os.Stat(normalizedPath)
		if err != nil {
			if os.IsNotExist(err) {
				return fmt.Errorf("%w: %s", conversation.ErrAttachmentNotFound, normalizedPath)
			}
			return err
		}
		if info.IsDir() {
			return fmt.Errorf("%w: %s", conversation.ErrAttachmentNotFile, normalizedPath)
		}
	}
	return nil
}
