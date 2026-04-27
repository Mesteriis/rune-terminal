package ids

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
)

var randomReader io.Reader = rand.Reader

func New(prefix string) string {
	buf := make([]byte, 8)
	fillRandomBytes(buf)
	if prefix == "" {
		return hex.EncodeToString(buf)
	}
	return prefix + "_" + hex.EncodeToString(buf)
}

func Token(byteCount int) string {
	if byteCount <= 0 {
		byteCount = 16
	}
	buf := make([]byte, byteCount)
	fillRandomBytes(buf)
	return hex.EncodeToString(buf)
}

func fillRandomBytes(buf []byte) {
	if _, err := io.ReadFull(randomReader, buf); err != nil {
		panic(fmt.Sprintf("ids: crypto random unavailable: %v", err))
	}
}
