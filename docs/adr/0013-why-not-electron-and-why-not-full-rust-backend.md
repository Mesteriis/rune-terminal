# ADR 0013: Why Not Electron And Why Not Full Rust Backend

## Status

Accepted

## Context

The rewrite required a firm stack decision because the old product was both Electron-based and Go-backed, while the new brief explicitly rejects a full-Rust backend.

## Decision

Do not use Electron for the new shell and do not use Rust as the main backend/runtime implementation language.

## Consequences

- desktop shell overhead stays lower than Electron
- backend logic remains concentrated in Go
- Rust work is constrained to areas where native shell concerns justify it

## Alternatives considered

- Electron + Go sidecar
- full Tauri + Rust rewrite
- mixed Rust/Go backend without a primary owner
