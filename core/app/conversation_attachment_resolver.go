package app

import (
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"unicode/utf8"

	"github.com/Mesteriis/rune-terminal/core/conversation"
)

const (
	defaultAttachmentMaxFileBytes = 256 * 1024
	defaultAttachmentMaxReadBytes = 32 * 1024
	defaultAttachmentMaxChars     = 8000
	defaultAttachmentMaxContext   = 4
)

type resolvedAttachment struct {
	Reference    conversation.AttachmentReference
	Content      string
	ContentRead  bool
	Truncated    bool
	Skipped      bool
	SkipReason   string
	DetectedMime string
}

type attachmentResolverLimits struct {
	MaxFileBytes int64
	MaxReadBytes int64
	MaxChars     int
}

func defaultAttachmentResolverLimits() attachmentResolverLimits {
	return attachmentResolverLimits{
		MaxFileBytes: defaultAttachmentMaxFileBytes,
		MaxReadBytes: defaultAttachmentMaxReadBytes,
		MaxChars:     defaultAttachmentMaxChars,
	}
}

func resolveConversationAttachments(attachments []conversation.AttachmentReference) ([]resolvedAttachment, error) {
	return resolveConversationAttachmentsWithLimits(attachments, defaultAttachmentResolverLimits())
}

func resolveConversationAttachmentsWithLimits(
	attachments []conversation.AttachmentReference,
	limits attachmentResolverLimits,
) ([]resolvedAttachment, error) {
	if len(attachments) == 0 {
		return nil, nil
	}

	if limits.MaxFileBytes < 1 {
		limits.MaxFileBytes = defaultAttachmentMaxFileBytes
	}
	if limits.MaxReadBytes < 1 {
		limits.MaxReadBytes = defaultAttachmentMaxReadBytes
	}
	if limits.MaxChars < 1 {
		limits.MaxChars = defaultAttachmentMaxChars
	}

	resolved := make([]resolvedAttachment, 0, len(attachments))
	for _, attachment := range attachments {
		path, info, err := statAttachmentPath(attachment.Path)
		if err != nil {
			return nil, err
		}

		resolvedAttachment := resolvedAttachment{
			Reference: attachment,
		}
		resolvedAttachment.Reference.Path = path
		resolvedAttachment.Reference.Name = firstNonEmptyValue(strings.TrimSpace(attachment.Name), filepath.Base(path))
		resolvedAttachment.Reference.Size = info.Size()
		resolvedAttachment.Reference.ModifiedTime = info.ModTime().UTC().Unix()
		resolvedAttachment.DetectedMime = attachmentMimeType(path, attachment.MimeType)
		resolvedAttachment.Reference.MimeType = resolvedAttachment.DetectedMime

		if info.Size() > limits.MaxFileBytes {
			resolvedAttachment.Skipped = true
			resolvedAttachment.SkipReason = "file_too_large"
			resolved = append(resolved, resolvedAttachment)
			continue
		}
		if !isTextLikeAttachment(path, resolvedAttachment.DetectedMime) {
			resolvedAttachment.Skipped = true
			resolvedAttachment.SkipReason = "unsupported_type"
			resolved = append(resolved, resolvedAttachment)
			continue
		}

		content, truncated, err := readAttachmentText(path, limits.MaxReadBytes, limits.MaxChars)
		if err != nil {
			return nil, err
		}
		resolvedAttachment.Content = content
		resolvedAttachment.ContentRead = content != ""
		resolvedAttachment.Truncated = truncated
		resolved = append(resolved, resolvedAttachment)
	}
	return resolved, nil
}

func statAttachmentPath(rawPath string) (string, os.FileInfo, error) {
	path := strings.TrimSpace(rawPath)
	if path == "" {
		return "", nil, conversation.ErrInvalidAttachmentPath
	}
	normalizedPath := filepath.Clean(path)
	if normalizedPath == "." || !filepath.IsAbs(normalizedPath) {
		return "", nil, conversation.ErrInvalidAttachmentPath
	}
	info, err := os.Stat(normalizedPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", nil, fmt.Errorf("%w: %s", conversation.ErrAttachmentNotFound, normalizedPath)
		}
		return "", nil, err
	}
	if info.IsDir() {
		return "", nil, fmt.Errorf("%w: %s", conversation.ErrAttachmentNotFile, normalizedPath)
	}
	return normalizedPath, info, nil
}

func readAttachmentText(path string, maxReadBytes int64, maxChars int) (string, bool, error) {
	file, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return "", false, fmt.Errorf("%w: %s", conversation.ErrAttachmentNotFound, path)
		}
		return "", false, err
	}
	defer file.Close()

	payload, err := io.ReadAll(io.LimitReader(file, maxReadBytes+1))
	if err != nil {
		return "", false, err
	}
	truncated := int64(len(payload)) > maxReadBytes
	if truncated {
		payload = payload[:maxReadBytes]
	}

	text := strings.TrimSpace(strings.ToValidUTF8(string(payload), ""))
	if text == "" {
		return "", truncated, nil
	}

	if utf8.RuneCountInString(text) > maxChars {
		runes := []rune(text)
		text = string(runes[:maxChars])
		truncated = true
	}
	return text, truncated, nil
}

func attachmentMimeType(path string, fallback string) string {
	mimeType := strings.TrimSpace(fallback)
	if mimeType != "" {
		return mimeType
	}
	detected := strings.TrimSpace(mime.TypeByExtension(filepath.Ext(path)))
	if detected != "" {
		return detected
	}
	return "application/octet-stream"
}

func isTextLikeAttachment(path string, mimeType string) bool {
	mimeType = strings.ToLower(strings.TrimSpace(mimeType))
	if strings.HasPrefix(mimeType, "text/") {
		return true
	}
	switch mimeType {
	case "application/json",
		"application/ld+json",
		"application/xml",
		"application/yaml",
		"application/x-yaml",
		"application/x-sh",
		"application/javascript":
		return true
	}

	switch strings.ToLower(filepath.Ext(path)) {
	case ".txt", ".md", ".markdown", ".rst",
		".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini",
		".xml", ".csv", ".log",
		".go", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
		".py", ".rs", ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".hpp",
		".sh", ".bash", ".zsh", ".fish", ".sql", ".graphql":
		return true
	default:
		return false
	}
}

func buildPromptWithAttachmentContext(prompt string, attachments []resolvedAttachment) string {
	basePrompt := strings.TrimSpace(prompt)
	contextBlock := buildAttachmentContextBlock(attachments)
	if contextBlock == "" {
		return basePrompt
	}
	if basePrompt == "" {
		return contextBlock
	}
	return basePrompt + "\n\n" + contextBlock
}

func buildAttachmentContextBlock(attachments []resolvedAttachment) string {
	if len(attachments) == 0 {
		return ""
	}

	limit := defaultAttachmentMaxContext
	if limit < 1 {
		limit = 1
	}
	visibleCount := len(attachments)
	if visibleCount > limit {
		visibleCount = limit
	}

	lines := []string{
		"Attachment context (local references, bounded):",
	}
	for index := 0; index < visibleCount; index++ {
		attachment := attachments[index]
		lines = append(lines,
			fmt.Sprintf("[%d] %s", index+1, attachment.Reference.Name),
			fmt.Sprintf("- path: %s", attachment.Reference.Path),
			fmt.Sprintf("- mime_type: %s", attachment.Reference.MimeType),
			fmt.Sprintf("- size_bytes: %d", attachment.Reference.Size),
			fmt.Sprintf("- modified_unix: %d", attachment.Reference.ModifiedTime),
		)

		switch {
		case attachment.Skipped:
			lines = append(lines, fmt.Sprintf("- status: skipped (%s)", attachment.SkipReason))
		case attachment.ContentRead:
			truncationFlag := "false"
			if attachment.Truncated {
				truncationFlag = "true"
			}
			lines = append(lines,
				fmt.Sprintf("- status: included (truncated=%s)", truncationFlag),
				"- content_excerpt:",
				"```text",
				attachment.Content,
				"```",
			)
		default:
			lines = append(lines, "- status: included (no_text_content)")
		}
	}

	if len(attachments) > visibleCount {
		lines = append(lines, fmt.Sprintf("- additional_attachments_omitted: %d", len(attachments)-visibleCount))
	}
	return strings.TrimSpace(strings.Join(lines, "\n"))
}

func firstNonEmptyValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
