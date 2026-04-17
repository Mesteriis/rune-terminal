# ADR 0002: Tauri As Desktop Shell

## Status

Accepted

## Context

The new desktop shell needs native packaging, process bootstrap and a predictable security boundary without forcing the entire backend into Rust.

## Decision

Use Tauri as the desktop shell and native app host.

## Consequences

- Rust remains limited to shell concerns
- app packaging for macOS and Linux becomes straightforward
- frontend and Go core can evolve independently behind a stable desktop boundary

## Alternatives considered

- Electron
- native GTK/Swift shell per platform

