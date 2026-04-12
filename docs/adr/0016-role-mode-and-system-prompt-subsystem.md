# ADR 0016: Role, Mode, and System Prompt Subsystem

## Status

Accepted

## Context

RunaTerminal needs prompt shaping for future AI workflows, but prompt text alone is not a sufficient control surface. The same selection must change runtime posture.

## Decision

Add a structured agent subsystem with:

- system prompt profiles
- role presets
- work modes
- persistent active selection
- merged policy overlays for capabilities, approval strictness and trusted-rule posture

## Consequences

- prompt selection becomes durable and testable
- reviewer/secure/release postures can actually constrain tools
- audit can attribute mutations to an active role/mode context

## Alternatives considered

- store a single free-form system prompt string
- keep roles and modes as frontend-only presentation state
