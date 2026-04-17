# Layout / Composition Baseline

Date: `2026-04-17`  
Phase: `1.0.0-rc1` release hardening

## 1. Current layout behavior

- Workspace shell renders a fixed high-level composition: top tab bar, center tab content, left AI panel (collapsible), and right utility rail (widgets/flyouts).
- Terminal sessions and tab/widget identity are backend-owned via workspace snapshot.
- Utility panels (`Tools`, `Audit`, `Files`, `Settings`, `Apps`) are frontend-controlled floating windows.
- Structured execution blocks render inside AI panel transcript flow; they do not own shell layout.

## 2. Fixed vs flexible today

Fixed:

- overall shell regions (tab bar, main content, AI panel lane, utility rail lane)
- no explicit backend layout entities or saved layout presets
- no drag/drop or user-defined panel geometry model

Flexible:

- AI panel open/close and width
- utility flyout open/close state
- tab focus/order/pin state
- active widget/session target

## 3. What composition means in this repo

In this repo, layout/composition means backend-described visibility/focus/mode over existing workspace surfaces, not a new renderer architecture. The composition layer should:

- describe which existing surfaces are active/visible
- describe a minimal mode (`split` vs `focus`) and active focus surface
- persist and restore with workspace snapshot truth
- keep terminal, `/run`, structured execution, tools/audit/MCP, and remote semantics unchanged

## 4. Explicitly out of scope

- full layout designer
- drag/drop grid system
- complex resizing logic
