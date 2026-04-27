package ids

import (
	"errors"
	"strings"
	"testing"
)

type failingReader struct{}

func (failingReader) Read(_ []byte) (int, error) {
	return 0, errors.New("entropy unavailable")
}

func TestNewPanicsWhenEntropyUnavailable(t *testing.T) {
	t.Parallel()

	previous := randomReader
	randomReader = failingReader{}
	t.Cleanup(func() {
		randomReader = previous
	})

	defer func() {
		recovered := recover()
		if recovered == nil {
			t.Fatal("expected panic")
		}
		if !strings.Contains(recovered.(string), "entropy unavailable") {
			t.Fatalf("unexpected panic: %v", recovered)
		}
	}()

	_ = New("conv")
}

func TestTokenPanicsWhenEntropyUnavailable(t *testing.T) {
	t.Parallel()

	previous := randomReader
	randomReader = failingReader{}
	t.Cleanup(func() {
		randomReader = previous
	})

	defer func() {
		recovered := recover()
		if recovered == nil {
			t.Fatal("expected panic")
		}
		if !strings.Contains(recovered.(string), "entropy unavailable") {
			t.Fatalf("unexpected panic: %v", recovered)
		}
	}()

	_ = Token(16)
}
