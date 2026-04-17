# ADR 0011: Audit Log Model

## Status

Accepted

## Context

Mutating and approval-sensitive actions need a durable trace for debugging, trust and later compliance features.

## Decision

Write audit events to a JSONL log owned by the Go core and append an event for every mutating or sensitive tool execution.

## Consequences

- event writes remain simple and portable
- future indexing can be added without changing the append contract
- validation can inspect real tool activity

## Alternatives considered

- no audit log in MVP
- store audit only in UI memory

