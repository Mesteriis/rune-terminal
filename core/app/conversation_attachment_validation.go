package app

import "github.com/Mesteriis/rune-terminal/core/conversation"

func validateAttachmentReferences(attachments []conversation.AttachmentReference) error {
	for _, attachment := range attachments {
		if _, _, err := statAttachmentPath(attachment.Path); err != nil {
			return err
		}
	}
	return nil
}
