package workspace

import "slices"

type LayoutMode string

const (
	LayoutModeSplit   LayoutMode = "split"
	LayoutModeFocus   LayoutMode = "focus"
	LayoutModeStacked LayoutMode = "stacked"
)

type LayoutRegion string

const (
	LayoutRegionMain    LayoutRegion = "main"
	LayoutRegionSidebar LayoutRegion = "sidebar"
	LayoutRegionUtility LayoutRegion = "utility"
)

type LayoutSurfaceID string

const (
	LayoutSurfaceTerminal LayoutSurfaceID = "terminal"
	LayoutSurfaceAI       LayoutSurfaceID = "ai"
	LayoutSurfaceTools    LayoutSurfaceID = "tools"
	LayoutSurfaceAudit    LayoutSurfaceID = "audit"
	LayoutSurfaceMCP      LayoutSurfaceID = "mcp"
)

type LayoutSurface struct {
	ID     LayoutSurfaceID `json:"id"`
	Region LayoutRegion    `json:"region"`
}

type Layout struct {
	ID              string          `json:"id"`
	Mode            LayoutMode      `json:"mode"`
	Surfaces        []LayoutSurface `json:"surfaces"`
	ActiveSurfaceID LayoutSurfaceID `json:"active_surface_id"`
}

func DefaultLayout() Layout {
	return Layout{
		ID:   "layout-default",
		Mode: LayoutModeSplit,
		Surfaces: []LayoutSurface{
			{ID: LayoutSurfaceTerminal, Region: LayoutRegionMain},
			{ID: LayoutSurfaceAI, Region: LayoutRegionSidebar},
			{ID: LayoutSurfaceTools, Region: LayoutRegionUtility},
			{ID: LayoutSurfaceAudit, Region: LayoutRegionUtility},
			{ID: LayoutSurfaceMCP, Region: LayoutRegionUtility},
		},
		ActiveSurfaceID: LayoutSurfaceTerminal,
	}
}

func cloneLayout(layout Layout) Layout {
	layout.Surfaces = slices.Clone(layout.Surfaces)
	return layout
}
