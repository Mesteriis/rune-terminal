import type * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { useRunaDomIdentity, useRunaDomScope } from '../dom-id'
import { Box, Button, Label, TextArea, type TextAreaProps } from '../primitives'

export type ExpandableTextAreaProps = Omit<TextAreaProps, 'onChange'> & {
  label?: string
  expandTarget?: 'parent' | string
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>
}

const rootStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
  position: 'relative' as const,
}

const controlsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--gap-xs)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const expandedHostBaseStyle = {
  position: 'fixed' as const,
  zIndex: 'var(--z-modal-widget)',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const expandedShellStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-sm)',
}

function getTargetElement(wrapper: HTMLDivElement | null, expandTarget: 'parent' | string) {
  if (typeof document === 'undefined' || !wrapper) {
    return null
  }

  if (expandTarget === 'parent') {
    return wrapper.parentElement
  }

  return document.querySelector(expandTarget) as HTMLElement | null
}

export function ExpandableTextArea({
  defaultValue,
  expandTarget = 'parent',
  id,
  label = 'Text area',
  onChange,
  value,
  ...textAreaProps
}: ExpandableTextAreaProps) {
  const scope = useRunaDomScope()
  const identity = useRunaDomIdentity(`${scope.component}-textarea`, id)
  const textAreaId = identity.id
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [draftValue, setDraftValue] = useState(String(defaultValue ?? ''))
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const isControlled = value !== undefined
  const resolvedValue = isControlled ? value : draftValue

  const updateTargetRect = () => {
    const targetElement = getTargetElement(wrapperRef.current, expandTarget)

    setTargetRect(targetElement ? targetElement.getBoundingClientRect() : null)
  }

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    updateTargetRect()

    const targetElement = getTargetElement(wrapperRef.current, expandTarget)
    const resizeObserver =
      typeof ResizeObserver === 'undefined' || !targetElement
        ? null
        : new ResizeObserver(() => updateTargetRect())

    if (resizeObserver && targetElement) {
      resizeObserver.observe(targetElement)
    }
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [expandTarget, isExpanded])

  const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    if (!isControlled) {
      setDraftValue(event.target.value)
    }

    onChange?.(event)
  }

  const sharedTextArea = (
    <TextArea
      {...textAreaProps}
      id={textAreaId}
      onChange={handleChange}
      runaComponent={`${scope.component}-textarea`}
      style={{
        ...(textAreaProps.style ?? {}),
        ...(isExpanded ? { height: '100%', minHeight: '100%', maxHeight: '100%', resize: 'none' } : {}),
      }}
      value={resolvedValue}
    />
  )

  const inlineContent = (
    <Box runaComponent={`${scope.component}-expandable-textarea-root`} style={rootStyle}>
      <Label htmlFor={textAreaId} runaComponent={`${scope.component}-expandable-textarea-label`}>
        {label}
      </Label>
      {sharedTextArea}
      <Box runaComponent={`${scope.component}-expandable-textarea-controls`} style={controlsStyle}>
        <Button
          onClick={() => setIsExpanded((currentValue) => !currentValue)}
          runaComponent={`${scope.component}-expandable-textarea-toggle`}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </Box>
    </Box>
  )

  const expandedContent = useMemo(() => {
    if (!isExpanded || !targetRect || typeof document === 'undefined') {
      return null
    }

    return createPortal(
      <Box
        runaComponent={`${scope.component}-expandable-textarea-host`}
        style={{
          ...expandedHostBaseStyle,
          left: `${targetRect.left}px`,
          top: `${targetRect.top}px`,
          width: `${targetRect.width}px`,
          height: `${targetRect.height}px`,
        }}
      >
        <Box runaComponent={`${scope.component}-expandable-textarea-shell`} style={expandedShellStyle}>
          <Label htmlFor={textAreaId} runaComponent={`${scope.component}-expandable-textarea-label`}>
            {label}
          </Label>
          {sharedTextArea}
          <Box runaComponent={`${scope.component}-expandable-textarea-controls`} style={controlsStyle}>
            <Button
              onClick={() => setIsExpanded(false)}
              runaComponent={`${scope.component}-expandable-textarea-collapse`}
            >
              Collapse
            </Button>
          </Box>
        </Box>
      </Box>,
      document.body,
    )
  }, [isExpanded, label, sharedTextArea, targetRect, textAreaId])

  return (
    <Box ref={wrapperRef} runaComponent={`${scope.component}-expandable-textarea-wrapper`}>
      {isExpanded ? expandedContent : inlineContent}
    </Box>
  )
}
