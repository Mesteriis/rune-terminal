package aiproxy

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

type circuitState int

const (
	circuitClosed circuitState = iota
	circuitOpen
	circuitHalfOpen
)

type circuitBreaker struct {
	State        circuitState
	FailureCount int
	OpenedAt     time.Time
	RecoveryHits int
}

type failedKey struct {
	Timestamp    time.Time
	FailureCount int
}

type Scheduler struct {
	mu               sync.Mutex
	channels         []Channel
	breakers         map[string]*circuitBreaker
	failedKeys       map[string]*failedKey
	failureThreshold int
	openDuration     time.Duration
	successThreshold int
	keyRecoveryTime  time.Duration
}

func NewScheduler(channels []Channel) *Scheduler {
	return &Scheduler{
		channels:         CloneChannels(channels),
		breakers:         make(map[string]*circuitBreaker),
		failedKeys:       make(map[string]*failedKey),
		failureThreshold: 3,
		openDuration:     30 * time.Second,
		successThreshold: 2,
		keyRecoveryTime:  5 * time.Minute,
	}
}

func (s *Scheduler) SelectChannel(exclude map[string]bool) (*Channel, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	candidates := make([]Channel, 0, len(s.channels))
	for _, channel := range s.channels {
		if channel.EffectiveStatus() == ChannelStatusDisabled {
			continue
		}
		if exclude[channel.ID] {
			continue
		}
		if !s.isChannelAvailableLocked(channel.ID) {
			continue
		}
		candidates = append(candidates, channel)
	}
	if len(candidates) == 0 {
		return nil, fmt.Errorf("no active proxy channels available")
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		if candidates[i].Priority == candidates[j].Priority {
			return candidates[i].Name < candidates[j].Name
		}
		return candidates[i].Priority < candidates[j].Priority
	})

	selected := candidates[0]
	return &selected, nil
}

func (s *Scheduler) NextAPIKey(channel Channel, failed map[string]bool) (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	keys := channel.EnabledAPIKeys()
	if len(keys) == 0 {
		return "", nil
	}
	if len(keys) == 1 {
		return keys[0], nil
	}
	for _, key := range keys {
		if failed[key] {
			continue
		}
		if s.isKeyFailedLocked(key) {
			continue
		}
		return key, nil
	}

	var oldestKey string
	var oldestTime time.Time
	for _, key := range keys {
		if failed[key] {
			continue
		}
		failure := s.failedKeys[key]
		if failure == nil {
			continue
		}
		if oldestKey == "" || failure.Timestamp.Before(oldestTime) {
			oldestKey = key
			oldestTime = failure.Timestamp
		}
	}
	if oldestKey != "" {
		return oldestKey, nil
	}
	return "", fmt.Errorf("all configured api keys are failed")
}

func (s *Scheduler) MarkKeyFailed(apiKey string) {
	if apiKey == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	record := s.failedKeys[apiKey]
	if record == nil {
		s.failedKeys[apiKey] = &failedKey{
			Timestamp:    time.Now(),
			FailureCount: 1,
		}
		return
	}
	record.Timestamp = time.Now()
	record.FailureCount++
}

func (s *Scheduler) RecordSuccess(channelID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	breaker := s.breakerLocked(channelID)
	switch breaker.State {
	case circuitHalfOpen:
		breaker.RecoveryHits++
		if breaker.RecoveryHits >= s.successThreshold {
			breaker.State = circuitClosed
			breaker.FailureCount = 0
			breaker.RecoveryHits = 0
		}
	default:
		breaker.State = circuitClosed
		breaker.FailureCount = 0
		breaker.RecoveryHits = 0
	}
}

func (s *Scheduler) RecordFailure(channelID string, retryable bool) {
	if !retryable {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()

	breaker := s.breakerLocked(channelID)
	breaker.FailureCount++
	switch breaker.State {
	case circuitHalfOpen:
		breaker.State = circuitOpen
		breaker.OpenedAt = time.Now()
		breaker.RecoveryHits = 0
	default:
		if breaker.FailureCount >= s.failureThreshold {
			breaker.State = circuitOpen
			breaker.OpenedAt = time.Now()
		}
	}
}

func (s *Scheduler) breakerLocked(channelID string) *circuitBreaker {
	breaker := s.breakers[channelID]
	if breaker != nil {
		return breaker
	}
	breaker = &circuitBreaker{State: circuitClosed}
	s.breakers[channelID] = breaker
	return breaker
}

func (s *Scheduler) isChannelAvailableLocked(channelID string) bool {
	breaker := s.breakerLocked(channelID)
	switch breaker.State {
	case circuitClosed:
		return true
	case circuitOpen:
		if time.Since(breaker.OpenedAt) >= s.openDuration {
			breaker.State = circuitHalfOpen
			breaker.RecoveryHits = 0
			return true
		}
		return false
	case circuitHalfOpen:
		return true
	default:
		return true
	}
}

func (s *Scheduler) isKeyFailedLocked(apiKey string) bool {
	record := s.failedKeys[apiKey]
	if record == nil {
		return false
	}
	recoveryTime := s.keyRecoveryTime
	if record.FailureCount > s.failureThreshold {
		recoveryTime *= 2
	}
	if time.Since(record.Timestamp) >= recoveryTime {
		delete(s.failedKeys, apiKey)
		return false
	}
	return true
}
