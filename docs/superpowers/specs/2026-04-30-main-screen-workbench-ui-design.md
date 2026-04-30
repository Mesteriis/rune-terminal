# Rune Terminal Main Screen UI Direction

Date: `2026-04-30`
Status: `Draft for review`
Scope: main screen visual direction only

## Goal

Define a stable visual direction for the Rune Terminal main screen that fits the product direction:

- terminal-first
- commander-second
- AI as a work assistant, not the product center
- future widget growth (`Slack`, `Telegram`, network, infra, and other tools) inside one unified workstation shell

This spec covers visual hierarchy and widget roles only. It does not change runtime behavior, API contracts, terminal execution, conversation semantics, or workspace architecture.

## Product framing

Rune Terminal should feel like a `developer operations console` and a `context-driven workbench`, not like:

- a chat app with a terminal attached
- a terminal emulator with decorative widgets
- a collection of separate mini-apps inside one window

The shell is the workstation frame. The active widget is the current tool in focus.

## Chosen direction

### Visual model

Adopt a `Workbench` direction rather than a louder instrument panel or a document-first app shell.

Core idea:

- the shell chrome stays calm and service-like
- the active widget becomes the main visual center
- each widget gets local character, but the shell anatomy stays shared

### Chosen variant

Use direction `A` from the visual comparison:

- `Commander-weighted Workbench`
- quiet topbar
- strong central terminal surface
- AI handled as a secondary side console
- geometry and density that can later support commander naturally

## Main-screen principles

### 1. Shell chrome

The global shell should organize work, not dominate it.

Rules:

- topbar stays narrow, quiet, and mostly service-oriented
- workspace tabs look like workspace navigation, not toolbar buttons
- all main widgets share one frame logic: header, toolbar, body, status
- status badges are visually calmer than action buttons
- the app background stays deeper and softer than the widget surfaces

Practical meaning:

- reduce contrast and decorative weight in the top shell
- avoid nested “cards inside cards” unless the nesting carries real meaning
- keep the active widget frame more legible than the global shell

### 2. Active-widget hierarchy

The active widget must be the most legible, cohesive, and visually confident region on screen.

Rules:

- the active widget owns the strongest surface on the page
- its header, toolbar, and body read as one tool, not three unrelated blocks
- secondary zones are quieter in contrast and detail
- whitespace and dark canvas should support the active widget instead of competing with it

Practical meaning:

- terminal should read as the center of gravity when it is active
- the future commander widget should be able to claim the same center-of-gravity role without a separate layout system

### 3. AI panel role

The AI panel is not the product center. It is an operator layer over current work.

Chosen role:

- `collapsible work panel`

Rules:

- AI is available by default, but should not permanently dominate the layout
- collapsed state shows only high-value context: active thread, route state, quick compose entry
- expanded state exposes the full assistant workflow
- the AI message area should feel closer to an analysis log / operator notebook than a consumer chat feed
- composer should feel like command drafting and context assembly, not a generic messenger input

Practical meaning:

- the current always-heavy left column should evolve into a lighter collapsed default
- AI should expand when needed, not visually tax the screen all the time

### 4. Widget identity system

Widgets need different working temperaments without becoming separate visual brands.

Shared shell anatomy:

- frame
- title row
- toolbar rhythm
- body spacing system
- status / action split

Local identity comes from:

- density
- accent usage
- iconography
- content rhythm

Per-widget character:

- `Terminal`: strictest, most compact, strongest body emphasis
- `Commander`: most structural, strongest grid and navigation logic
- `AI`: most analytical, more grouped text and context blocks
- `Communication widgets`: more flow-oriented, but still within shell anatomy
- `Network / infra widgets`: more status-oriented, but without returning to noisy dashboard chrome

## Layout implications

### AI layout

Preferred long-term behavior:

- collapsed-by-default or at least noticeably narrower default state
- expanded side panel when actively working with AI
- no separate “AI mode” that takes over the product identity

### Commander layout

Commander should support both of these without becoming second-class in either:

1. standalone main widget in the workspace
2. split-first neighbor beside terminal

Chosen rule:

- both scenarios are first-class and equal

This preserves the product vision of one workstation that adapts to current work rather than forcing one permanent layout ideology.

## What this direction rejects

The chosen direction explicitly rejects:

- making AI the dominant visual center
- using heavy dashboard chrome on every surface
- making each widget feel like a separate product theme
- treating terminal as the only “real” tool and all future widgets as add-ons
- solving hierarchy with more borders instead of better surface rhythm

## Success criteria

The direction is successful when:

- the active widget is obvious within one glance
- the shell feels calmer than the active tool
- terminal remains primary without preventing commander from becoming equally important when active
- AI feels useful and present, but not dominant
- future widgets can be added without redesigning the shell for each new domain

## Suggested next implementation slice

Apply this direction in one narrow UI-only slice:

1. quiet the shell topbar and workspace strip further
2. define active vs secondary widget surface contrast more clearly
3. prototype AI panel collapsed/default behavior
4. reshape AI message/composer presentation toward operator notebook semantics
5. prepare the same shell anatomy for a future commander-first center state

## Out of scope

- backend changes
- terminal runtime changes
- conversation model changes
- workspace persistence changes
- API contract changes
- new widget functionality
- full design-system rewrite
