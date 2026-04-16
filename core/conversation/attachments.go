package conversation

type AttachmentReference struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Path         string `json:"path"`
	MimeType     string `json:"mime_type"`
	Size         int64  `json:"size"`
	ModifiedTime int64  `json:"modified_time"`
}
