# ADR 0016: Role, Mode, and System Prompt Subsystem

## Status

Accepted

## Context

rune-terminal needs prompt shaping for future AI workflows, but prompt text alone is not a sufficient control surface. The same selection must change runtime posture.

## Decision

Add a structured agent subsystem with:

- system prompt profiles
- role presets
- work modes
- persistent active selection
- merged policy overlays for capabilities, approval strictness and trusted-rule posture

Semantic boundaries are explicit:

- prompt profile:
  baseline system contract and default security posture
- role preset:
  durable professional responsibility lens
- work mode:
  transient execution posture for the current task

The effective prompt is composed in that order: profile, role, then mode. The effective policy overlay is merged in the same order.

## Consequences

- prompt selection becomes durable and testable
- reviewer/secure/release postures can actually constrain tools
- audit can attribute mutations to an active role/mode context
- transport and UI can manage the active selection through a stable catalog instead of mutating raw prompt text

## Alternatives considered

- store a single free-form system prompt string
- keep roles and modes as frontend-only presentation state
