package toolruntime

import (
	"fmt"
	"sync"
	"time"

	"github.com/Mesteriis/rune-terminal/core/policy"
	"github.com/Mesteriis/rune-terminal/internal/ids"
)

type approvalVerificationResult int

const (
	approvalVerificationMissing approvalVerificationResult = iota
	approvalVerificationGranted
	approvalVerificationMismatch
)

type pendingApprovalRecord struct {
	approval  PendingApproval
	intentKey string
}

type approvalGrantRecord struct {
	grant     ApprovalGrant
	intentKey string
}

type approvalStore struct {
	mu      sync.Mutex
	pending map[string]pendingApprovalRecord
	grants  map[string]approvalGrantRecord
}

func newApprovalStore() *approvalStore {
	return &approvalStore{
		pending: make(map[string]pendingApprovalRecord),
		grants:  make(map[string]approvalGrantRecord),
	}
}

func (s *approvalStore) Create(toolName string, summary string, tier policy.ApprovalTier, intentKey string) PendingApproval {
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
	s.pending[approval.ID] = pendingApprovalRecord{
		approval:  approval,
		intentKey: intentKey,
	}
	return approval
}

func (s *approvalStore) Confirm(id string) (ApprovalGrant, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, ok := s.pending[id]
	if !ok {
		return ApprovalGrant{}, fmt.Errorf("%w: %s", ErrPendingApprovalNotFound, id)
	}
	approval := record.approval
	if time.Now().UTC().After(approval.ExpiresAt) {
		delete(s.pending, id)
		return ApprovalGrant{}, fmt.Errorf("%w: %s", ErrPendingApprovalExpired, id)
	}
	grant := ApprovalGrant{
		ApprovalID: approval.ID,
		Token:      ids.Token(16),
		ExpiresAt:  time.Now().UTC().Add(10 * time.Minute),
	}
	delete(s.pending, id)
	s.grants[grant.Token] = approvalGrantRecord{
		grant:     grant,
		intentKey: record.intentKey,
	}
	return grant, nil
}

func (s *approvalStore) Verify(token string, intentKey string) approvalVerificationResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	if token == "" {
		return approvalVerificationMissing
	}
	record, ok := s.grants[token]
	if !ok {
		return approvalVerificationMissing
	}
	grant := record.grant
	if time.Now().UTC().After(grant.ExpiresAt) {
		delete(s.grants, token)
		return approvalVerificationMissing
	}
	if record.intentKey != intentKey {
		return approvalVerificationMismatch
	}
	delete(s.grants, token)
	return approvalVerificationGranted
}
