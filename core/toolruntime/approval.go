package toolruntime

import (
	"fmt"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type approvalStore struct {
	mu      sync.Mutex
	pending map[string]PendingApproval
	grants  map[string]ApprovalGrant
	tools   map[string]string
}

func newApprovalStore() *approvalStore {
	return &approvalStore{
		pending: make(map[string]PendingApproval),
		grants:  make(map[string]ApprovalGrant),
		tools:   make(map[string]string),
	}
}

func (s *approvalStore) Create(toolName string, summary string, tier policy.ApprovalTier) PendingApproval {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC()
	approval := PendingApproval{
		ID:           ids.New("approval"),
		ToolName:     toolName,
		Summary:      summary,
		ApprovalTier: tier,
		CreatedAt:    now,
		ExpiresAt:    now.Add(10 * time.Minute),
	}
	s.pending[approval.ID] = approval
	s.tools[approval.ID] = toolName
	return approval
}

func (s *approvalStore) Confirm(id string) (ApprovalGrant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	approval, ok := s.pending[id]
	if !ok {
		return ApprovalGrant{}, fmt.Errorf("%w: %s", ErrPendingApprovalNotFound, id)
	}
	if time.Now().UTC().After(approval.ExpiresAt) {
		delete(s.pending, id)
		delete(s.tools, id)
		return ApprovalGrant{}, fmt.Errorf("%w: %s", ErrPendingApprovalExpired, id)
	}
	grant := ApprovalGrant{
		ApprovalID: approval.ID,
		Token:      ids.Token(16),
		ExpiresAt:  time.Now().UTC().Add(10 * time.Minute),
	}
	delete(s.pending, id)
	delete(s.tools, id)
	s.grants[grant.Token] = grant
	s.tools[grant.Token] = approval.ToolName
	return grant, nil
}

func (s *approvalStore) Verify(toolName string, token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if token == "" {
		return false
	}
	grant, ok := s.grants[token]
	if !ok {
		return false
	}
	if s.tools[token] != toolName || time.Now().UTC().After(grant.ExpiresAt) {
		delete(s.grants, token)
		delete(s.tools, token)
		return false
	}
	delete(s.grants, token)
	delete(s.tools, token)
	return true
}
