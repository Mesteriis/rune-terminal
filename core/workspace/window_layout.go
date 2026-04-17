package workspace

import (
	"fmt"
	"strings"
)

type WindowNodeKind string

const (
	WindowNodeLeaf  WindowNodeKind = "leaf"
	WindowNodeSplit WindowNodeKind = "split"
)

type WindowSplitAxis string

const (
	WindowSplitHorizontal WindowSplitAxis = "horizontal"
	WindowSplitVertical   WindowSplitAxis = "vertical"
)

type WindowSplitDirection string

const (
	WindowSplitLeft   WindowSplitDirection = "left"
	WindowSplitRight  WindowSplitDirection = "right"
	WindowSplitTop    WindowSplitDirection = "top"
	WindowSplitBottom WindowSplitDirection = "bottom"
)

type WindowMoveDirection string

const (
	WindowMoveLeft        WindowMoveDirection = "left"
	WindowMoveRight       WindowMoveDirection = "right"
	WindowMoveTop         WindowMoveDirection = "top"
	WindowMoveBottom      WindowMoveDirection = "bottom"
	WindowMoveOuterLeft   WindowMoveDirection = "outer-left"
	WindowMoveOuterRight  WindowMoveDirection = "outer-right"
	WindowMoveOuterTop    WindowMoveDirection = "outer-top"
	WindowMoveOuterBottom WindowMoveDirection = "outer-bottom"
	WindowMoveCenter      WindowMoveDirection = "center"
)

type WindowLayoutNode struct {
	Kind     WindowNodeKind    `json:"kind"`
	WidgetID string            `json:"widget_id,omitempty"`
	Axis     WindowSplitAxis   `json:"axis,omitempty"`
	First    *WindowLayoutNode `json:"first,omitempty"`
	Second   *WindowLayoutNode `json:"second,omitempty"`
}

func cloneWindowLayout(node *WindowLayoutNode) *WindowLayoutNode {
	if node == nil {
		return nil
	}
	return &WindowLayoutNode{
		Kind:     node.Kind,
		WidgetID: node.WidgetID,
		Axis:     node.Axis,
		First:    cloneWindowLayout(node.First),
		Second:   cloneWindowLayout(node.Second),
	}
}

func ParseWindowSplitDirection(raw string) (WindowSplitDirection, error) {
	value := WindowSplitDirection(strings.TrimSpace(strings.ToLower(raw)))
	if value == "" {
		return WindowSplitRight, nil
	}
	switch value {
	case WindowSplitLeft:
		return WindowSplitLeft, nil
	case WindowSplitRight:
		return WindowSplitRight, nil
	case WindowSplitTop:
		return WindowSplitTop, nil
	case WindowSplitBottom:
		return WindowSplitBottom, nil
	default:
		return "", fmt.Errorf("%w: %s", ErrInvalidWindowSplitDirection, raw)
	}
}

func ParseWindowMoveDirection(raw string) (WindowMoveDirection, error) {
	normalized := normalizeWindowMoveDirection(raw)
	switch normalized {
	case "left":
		return WindowMoveLeft, nil
	case "right":
		return WindowMoveRight, nil
	case "top":
		return WindowMoveTop, nil
	case "bottom":
		return WindowMoveBottom, nil
	case "outer-left":
		return WindowMoveOuterLeft, nil
	case "outer-right":
		return WindowMoveOuterRight, nil
	case "outer-top":
		return WindowMoveOuterTop, nil
	case "outer-bottom":
		return WindowMoveOuterBottom, nil
	case "center":
		return WindowMoveCenter, nil
	default:
		return "", fmt.Errorf("%w: %s", ErrInvalidWindowSplitDirection, raw)
	}
}

func normalizeWindowMoveDirection(raw string) string {
	value := strings.TrimSpace(strings.ToLower(raw))
	value = strings.ReplaceAll(value, "_", "-")
	value = strings.ReplaceAll(value, " ", "")
	switch value {
	case "outerleft":
		return "outer-left"
	case "outerright":
		return "outer-right"
	case "outertop":
		return "outer-top"
	case "outerbottom":
		return "outer-bottom"
	default:
		return value
	}
}

func splitSpecFromDirection(direction WindowSplitDirection) (WindowSplitAxis, bool, error) {
	switch direction {
	case WindowSplitLeft:
		return WindowSplitHorizontal, true, nil
	case WindowSplitRight:
		return WindowSplitHorizontal, false, nil
	case WindowSplitTop:
		return WindowSplitVertical, true, nil
	case WindowSplitBottom:
		return WindowSplitVertical, false, nil
	default:
		return "", false, fmt.Errorf("%w: %s", ErrInvalidWindowSplitDirection, direction)
	}
}

func splitSpecFromMoveDirection(direction WindowMoveDirection) (WindowSplitAxis, bool, error) {
	switch direction {
	case WindowMoveLeft, WindowMoveOuterLeft:
		return WindowSplitHorizontal, true, nil
	case WindowMoveRight, WindowMoveOuterRight:
		return WindowSplitHorizontal, false, nil
	case WindowMoveTop, WindowMoveOuterTop:
		return WindowSplitVertical, true, nil
	case WindowMoveBottom, WindowMoveOuterBottom:
		return WindowSplitVertical, false, nil
	default:
		return "", false, fmt.Errorf("%w: %s", ErrInvalidWindowSplitDirection, direction)
	}
}

func moveDirectionIsOuter(direction WindowMoveDirection) bool {
	switch direction {
	case WindowMoveOuterLeft, WindowMoveOuterRight, WindowMoveOuterTop, WindowMoveOuterBottom:
		return true
	default:
		return false
	}
}

func normalizeWindowLayout(layout *WindowLayoutNode, widgetIDs []string, preferredWidgetID string) *WindowLayoutNode {
	normalizedWidgetIDs := make([]string, 0, len(widgetIDs))
	validWidgetIDs := make(map[string]struct{}, len(widgetIDs))
	for _, widgetID := range widgetIDs {
		widgetID = strings.TrimSpace(widgetID)
		if widgetID == "" {
			continue
		}
		if _, exists := validWidgetIDs[widgetID]; exists {
			continue
		}
		validWidgetIDs[widgetID] = struct{}{}
		normalizedWidgetIDs = append(normalizedWidgetIDs, widgetID)
	}
	if len(normalizedWidgetIDs) == 0 {
		return nil
	}

	seen := make(map[string]struct{}, len(normalizedWidgetIDs))
	sanitized := sanitizeWindowLayout(layout, validWidgetIDs, seen)
	if sanitized == nil {
		firstWidgetID := normalizedWidgetIDs[0]
		sanitized = &WindowLayoutNode{Kind: WindowNodeLeaf, WidgetID: firstWidgetID}
		seen[firstWidgetID] = struct{}{}
	}

	insertTarget := ""
	preferredWidgetID = strings.TrimSpace(preferredWidgetID)
	if preferredWidgetID != "" {
		if _, ok := seen[preferredWidgetID]; ok {
			insertTarget = preferredWidgetID
		}
	}
	if insertTarget == "" {
		insertTarget = lastWindowLeafID(sanitized)
	}

	for _, widgetID := range normalizedWidgetIDs {
		if _, ok := seen[widgetID]; ok {
			continue
		}
		next, changed, err := splitWindowLayoutAtWidget(sanitized, insertTarget, widgetID, WindowSplitRight)
		if err != nil || !changed {
			fallbackTarget := lastWindowLeafID(sanitized)
			next, changed, err = splitWindowLayoutAtWidget(sanitized, fallbackTarget, widgetID, WindowSplitRight)
			if err != nil || !changed {
				next = &WindowLayoutNode{
					Kind:  WindowNodeSplit,
					Axis:  WindowSplitHorizontal,
					First: sanitized,
					Second: &WindowLayoutNode{
						Kind:     WindowNodeLeaf,
						WidgetID: widgetID,
					},
				}
			}
		}
		sanitized = next
		insertTarget = widgetID
		seen[widgetID] = struct{}{}
	}

	return sanitized
}

func sanitizeWindowLayout(
	node *WindowLayoutNode,
	validWidgetIDs map[string]struct{},
	seenWidgetIDs map[string]struct{},
) *WindowLayoutNode {
	if node == nil {
		return nil
	}
	kind := node.Kind
	switch kind {
	case WindowNodeLeaf:
		widgetID := strings.TrimSpace(node.WidgetID)
		if widgetID == "" {
			return nil
		}
		if _, ok := validWidgetIDs[widgetID]; !ok {
			return nil
		}
		if _, duplicate := seenWidgetIDs[widgetID]; duplicate {
			return nil
		}
		seenWidgetIDs[widgetID] = struct{}{}
		return &WindowLayoutNode{
			Kind:     WindowNodeLeaf,
			WidgetID: widgetID,
		}
	case WindowNodeSplit:
		first := sanitizeWindowLayout(node.First, validWidgetIDs, seenWidgetIDs)
		second := sanitizeWindowLayout(node.Second, validWidgetIDs, seenWidgetIDs)
		if first == nil && second == nil {
			return nil
		}
		if first == nil {
			return second
		}
		if second == nil {
			return first
		}
		axis := node.Axis
		if axis != WindowSplitHorizontal && axis != WindowSplitVertical {
			axis = WindowSplitHorizontal
		}
		return &WindowLayoutNode{
			Kind:   WindowNodeSplit,
			Axis:   axis,
			First:  first,
			Second: second,
		}
	default:
		if strings.TrimSpace(node.WidgetID) != "" {
			leaf := &WindowLayoutNode{
				Kind:     WindowNodeLeaf,
				WidgetID: node.WidgetID,
			}
			return sanitizeWindowLayout(leaf, validWidgetIDs, seenWidgetIDs)
		}
		if node.First != nil || node.Second != nil {
			split := &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   node.Axis,
				First:  node.First,
				Second: node.Second,
			}
			return sanitizeWindowLayout(split, validWidgetIDs, seenWidgetIDs)
		}
		return nil
	}
}

func lastWindowLeafID(node *WindowLayoutNode) string {
	if node == nil {
		return ""
	}
	if node.Kind == WindowNodeLeaf {
		return node.WidgetID
	}
	if right := lastWindowLeafID(node.Second); right != "" {
		return right
	}
	return lastWindowLeafID(node.First)
}

func firstWindowLeafID(node *WindowLayoutNode) string {
	if node == nil {
		return ""
	}
	if node.Kind == WindowNodeLeaf {
		return node.WidgetID
	}
	if left := firstWindowLeafID(node.First); left != "" {
		return left
	}
	return firstWindowLeafID(node.Second)
}

func windowLayoutContainsWidget(node *WindowLayoutNode, widgetID string) bool {
	widgetID = strings.TrimSpace(widgetID)
	if widgetID == "" || node == nil {
		return false
	}
	if node.Kind == WindowNodeLeaf {
		return node.WidgetID == widgetID
	}
	return windowLayoutContainsWidget(node.First, widgetID) || windowLayoutContainsWidget(node.Second, widgetID)
}

func splitWindowLayoutAtWidget(
	layout *WindowLayoutNode,
	targetWidgetID string,
	newWidgetID string,
	direction WindowSplitDirection,
) (*WindowLayoutNode, bool, error) {
	targetWidgetID = strings.TrimSpace(targetWidgetID)
	newWidgetID = strings.TrimSpace(newWidgetID)
	if targetWidgetID == "" || newWidgetID == "" {
		return cloneWindowLayout(layout), false, nil
	}
	axis, insertBefore, err := splitSpecFromDirection(direction)
	if err != nil {
		return nil, false, err
	}

	var splitRec func(node *WindowLayoutNode) (*WindowLayoutNode, bool)
	splitRec = func(node *WindowLayoutNode) (*WindowLayoutNode, bool) {
		if node == nil {
			return nil, false
		}
		if node.Kind == WindowNodeLeaf {
			if node.WidgetID != targetWidgetID {
				return cloneWindowLayout(node), false
			}
			targetLeaf := cloneWindowLayout(node)
			newLeaf := &WindowLayoutNode{Kind: WindowNodeLeaf, WidgetID: newWidgetID}
			if insertBefore {
				return &WindowLayoutNode{
					Kind:   WindowNodeSplit,
					Axis:   axis,
					First:  newLeaf,
					Second: targetLeaf,
				}, true
			}
			return &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   axis,
				First:  targetLeaf,
				Second: newLeaf,
			}, true
		}

		first, changed := splitRec(node.First)
		if changed {
			return &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   node.Axis,
				First:  first,
				Second: cloneWindowLayout(node.Second),
			}, true
		}
		second, changed := splitRec(node.Second)
		if changed {
			return &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   node.Axis,
				First:  cloneWindowLayout(node.First),
				Second: second,
			}, true
		}
		return cloneWindowLayout(node), false
	}

	next, changed := splitRec(layout)
	return next, changed, nil
}

func splitWindowLayoutAtPath(
	layout *WindowLayoutNode,
	targetPath []bool,
	newWidgetID string,
	axis WindowSplitAxis,
	insertBefore bool,
) (*WindowLayoutNode, bool) {
	newWidgetID = strings.TrimSpace(newWidgetID)
	if newWidgetID == "" {
		return cloneWindowLayout(layout), false
	}

	var splitRec func(node *WindowLayoutNode, depth int) (*WindowLayoutNode, bool)
	splitRec = func(node *WindowLayoutNode, depth int) (*WindowLayoutNode, bool) {
		if node == nil {
			return nil, false
		}
		if depth == len(targetPath) {
			targetNode := cloneWindowLayout(node)
			newLeaf := &WindowLayoutNode{Kind: WindowNodeLeaf, WidgetID: newWidgetID}
			if insertBefore {
				return &WindowLayoutNode{
					Kind:   WindowNodeSplit,
					Axis:   axis,
					First:  newLeaf,
					Second: targetNode,
				}, true
			}
			return &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   axis,
				First:  targetNode,
				Second: newLeaf,
			}, true
		}
		if node.Kind != WindowNodeSplit {
			return cloneWindowLayout(node), false
		}
		if !targetPath[depth] {
			first, changed := splitRec(node.First, depth+1)
			if !changed {
				return cloneWindowLayout(node), false
			}
			return &WindowLayoutNode{
				Kind:   WindowNodeSplit,
				Axis:   node.Axis,
				First:  first,
				Second: cloneWindowLayout(node.Second),
			}, true
		}
		second, changed := splitRec(node.Second, depth+1)
		if !changed {
			return cloneWindowLayout(node), false
		}
		return &WindowLayoutNode{
			Kind:   WindowNodeSplit,
			Axis:   node.Axis,
			First:  cloneWindowLayout(node.First),
			Second: second,
		}, true
	}

	return splitRec(layout, 0)
}

func findWindowLeafPath(layout *WindowLayoutNode, widgetID string) ([]bool, bool) {
	widgetID = strings.TrimSpace(widgetID)
	if widgetID == "" || layout == nil {
		return nil, false
	}
	var path []bool
	var findRec func(node *WindowLayoutNode, current []bool) bool
	findRec = func(node *WindowLayoutNode, current []bool) bool {
		if node == nil {
			return false
		}
		if node.Kind == WindowNodeLeaf {
			if node.WidgetID != widgetID {
				return false
			}
			path = append([]bool(nil), current...)
			return true
		}
		if findRec(node.First, append(current, false)) {
			return true
		}
		return findRec(node.Second, append(current, true))
	}
	if !findRec(layout, nil) {
		return nil, false
	}
	return path, true
}

func nodeAtWindowPath(layout *WindowLayoutNode, path []bool) *WindowLayoutNode {
	current := layout
	for _, step := range path {
		if current == nil || current.Kind != WindowNodeSplit {
			return nil
		}
		if step {
			current = current.Second
		} else {
			current = current.First
		}
	}
	return current
}

func outerInsertPathForTarget(layout *WindowLayoutNode, targetWidgetID string, axis WindowSplitAxis) ([]bool, bool) {
	leafPath, ok := findWindowLeafPath(layout, targetWidgetID)
	if !ok {
		return nil, false
	}
	// Outer drop wraps the nearest matching-axis split group that is not root.
	for depth := len(leafPath) - 1; depth >= 1; depth-- {
		candidatePath := leafPath[:depth]
		node := nodeAtWindowPath(layout, candidatePath)
		if node != nil && node.Kind == WindowNodeSplit && node.Axis == axis {
			return append([]bool(nil), candidatePath...), true
		}
	}
	return nil, false
}

func moveWindowLayoutByDirection(
	layout *WindowLayoutNode,
	widgetID string,
	targetWidgetID string,
	direction WindowMoveDirection,
) (*WindowLayoutNode, bool, error) {
	if direction == WindowMoveCenter {
		nextLayout, changed := swapWindowLayoutWidgets(layout, widgetID, targetWidgetID)
		return nextLayout, changed, nil
	}
	axis, insertBefore, err := splitSpecFromMoveDirection(direction)
	if err != nil {
		return nil, false, err
	}

	layoutWithoutWidget, removed := removeWindowLayoutWidget(layout, widgetID)
	if !removed {
		return cloneWindowLayout(layout), false, nil
	}
	if layoutWithoutWidget == nil {
		return cloneWindowLayout(layout), false, nil
	}

	if moveDirectionIsOuter(direction) {
		insertPath, found := outerInsertPathForTarget(layoutWithoutWidget, targetWidgetID, axis)
		if found {
			next, changed := splitWindowLayoutAtPath(layoutWithoutWidget, insertPath, widgetID, axis, insertBefore)
			if changed {
				return next, true, nil
			}
		}
	}

	var fallbackSplitDirection WindowSplitDirection
	switch direction {
	case WindowMoveLeft, WindowMoveOuterLeft:
		fallbackSplitDirection = WindowSplitLeft
	case WindowMoveRight, WindowMoveOuterRight:
		fallbackSplitDirection = WindowSplitRight
	case WindowMoveTop, WindowMoveOuterTop:
		fallbackSplitDirection = WindowSplitTop
	case WindowMoveBottom, WindowMoveOuterBottom:
		fallbackSplitDirection = WindowSplitBottom
	default:
		return nil, false, fmt.Errorf("%w: %s", ErrInvalidWindowSplitDirection, direction)
	}

	nextLayout, changed, err := splitWindowLayoutAtWidget(layoutWithoutWidget, targetWidgetID, widgetID, fallbackSplitDirection)
	if err != nil {
		return nil, false, err
	}
	return nextLayout, changed, nil
}

func swapWindowLayoutWidgets(layout *WindowLayoutNode, widgetA string, widgetB string) (*WindowLayoutNode, bool) {
	widgetA = strings.TrimSpace(widgetA)
	widgetB = strings.TrimSpace(widgetB)
	if layout == nil || widgetA == "" || widgetB == "" || widgetA == widgetB {
		return cloneWindowLayout(layout), false
	}

	foundA := false
	foundB := false
	var swapRec func(node *WindowLayoutNode) *WindowLayoutNode
	swapRec = func(node *WindowLayoutNode) *WindowLayoutNode {
		if node == nil {
			return nil
		}
		if node.Kind == WindowNodeLeaf {
			nextWidgetID := node.WidgetID
			switch node.WidgetID {
			case widgetA:
				nextWidgetID = widgetB
				foundA = true
			case widgetB:
				nextWidgetID = widgetA
				foundB = true
			}
			return &WindowLayoutNode{
				Kind:     WindowNodeLeaf,
				WidgetID: nextWidgetID,
			}
		}
		return &WindowLayoutNode{
			Kind:   WindowNodeSplit,
			Axis:   node.Axis,
			First:  swapRec(node.First),
			Second: swapRec(node.Second),
		}
	}

	nextLayout := swapRec(layout)
	if !foundA || !foundB {
		return cloneWindowLayout(layout), false
	}
	return nextLayout, true
}

func removeWindowLayoutWidget(layout *WindowLayoutNode, widgetID string) (*WindowLayoutNode, bool) {
	widgetID = strings.TrimSpace(widgetID)
	if widgetID == "" || layout == nil {
		return cloneWindowLayout(layout), false
	}
	if layout.Kind == WindowNodeLeaf {
		if layout.WidgetID == widgetID {
			return nil, true
		}
		return cloneWindowLayout(layout), false
	}

	first, removedFirst := removeWindowLayoutWidget(layout.First, widgetID)
	second, removedSecond := removeWindowLayoutWidget(layout.Second, widgetID)
	if !removedFirst && !removedSecond {
		return cloneWindowLayout(layout), false
	}
	if first == nil && second == nil {
		return nil, true
	}
	if first == nil {
		return second, true
	}
	if second == nil {
		return first, true
	}
	return &WindowLayoutNode{
		Kind:   WindowNodeSplit,
		Axis:   layout.Axis,
		First:  first,
		Second: second,
	}, true
}
