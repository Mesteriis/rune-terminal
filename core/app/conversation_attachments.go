package app

import (
	"mime"
	"os"
	"path/filepath"
	"strings"

	"github.com/Mesteriis/rune-terminal/core/conversation"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type CreateAttachmentReferenceRequest struct {
	Path string `json:"path"`
}

func (r *Runtime) CreateAttachmentReference(
	request CreateAttachmentReferenceRequest,
) (conversation.AttachmentReference, error) {
	rawPath := strings.TrimSpace(request.Path)
	if rawPath == "" {
		return conversation.AttachmentReference{}, conversation.ErrInvalidAttachmentPath
	}

	normalizedPath := filepath.Clean(rawPath)
	if normalizedPath == "." || !filepath.IsAbs(normalizedPath) {
		return conversation.AttachmentReference{}, conversation.ErrInvalidAttachmentPath
	}

	info, err := os.Stat(normalizedPath)
	if err != nil {
		if os.IsNotExist(err) {
			return conversation.AttachmentReference{}, conversation.ErrAttachmentNotFound
		}
		return conversation.AttachmentReference{}, err
	}
	if info.IsDir() {
		return conversation.AttachmentReference{}, conversation.ErrAttachmentNotFile
	}

	name := filepath.Base(normalizedPath)
	mimeType := strings.TrimSpace(mime.TypeByExtension(filepath.Ext(name)))
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	return conversation.AttachmentReference{
		ID:           ids.New("att"),
		Name:         name,
		Path:         normalizedPath,
		MimeType:     mimeType,
		Size:         info.Size(),
		ModifiedTime: info.ModTime().UTC().Unix(),
	}, nil
}
