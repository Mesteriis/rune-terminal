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
