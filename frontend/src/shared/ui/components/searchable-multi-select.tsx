import { useId, useMemo, useState } from 'react'

import { Box, Button, Input, Text } from '@/shared/ui/primitives'

export type SearchableMultiSelectOption = {
  value: string
  label: string
  title?: string
  meta?: string
  group?: string
}

export type SearchableMultiSelectProps = {
  label?: string
  options: SearchableMultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  searchPlaceholder?: string
}

const rootStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
}

const inputStyle = {
  background: 'var(--color-surface-glass-strong)',
}

const optionsStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
  maxHeight: '240px',
  overflow: 'auto',
  padding: 0,
  border: 'none',
  borderRadius: 0,
  background: 'transparent',
  boxShadow: 'none',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
}

const optionButtonStyle = {
  minHeight: '42px',
  justifyContent: 'space-between',
  width: '100%',
  padding: 'var(--space-xs) var(--space-sm)',
  borderRadius: 'var(--radius-sm)',
  borderColor: 'var(--color-border-strong)',
  background: 'color-mix(in srgb, var(--color-surface-glass-strong) 84%, transparent)',
  boxShadow: 'none',
}

const optionTextClusterStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'flex-start',
  minWidth: 0,
  gap: '2px',
  flex: 1,
}

const optionMetaStyle = {
  color: 'var(--color-text-secondary)',
  fontSize: '12px',
  lineHeight: '16px',
}

const optionActionStyle = {
  minWidth: '60px',
  padding: '0 var(--space-xs)',
  border: '1px solid var(--color-border-strong)',
  borderRadius: 'var(--radius-xs)',
  background: 'color-mix(in srgb, var(--color-surface-glass-soft) 82%, transparent)',
  color: 'var(--color-text-secondary)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  textAlign: 'center' as const,
}

const optionActionSelectedStyle = {
  background: 'color-mix(in srgb, var(--color-accent-emerald-soft) 22%, var(--color-surface-glass-soft))',
  color: 'var(--color-text-primary)',
}

const optionGroupStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '6px',
}

const optionGroupTitleStyle = {
  padding: '0 var(--space-xs)',
  color: 'var(--color-text-secondary)',
  fontSize: '11px',
  lineHeight: '16px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
}

const emptyStateStyle = {
  padding: 'var(--space-sm)',
  color: 'var(--color-text-secondary)',
}

export function SearchableMultiSelect({
  label = 'Select options',
  options,
  value,
  onChange,
  searchPlaceholder = 'Search options',
}: SearchableMultiSelectProps) {
  const labelId = useId()
  const listboxId = useId()
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery === '') {
      return options
    }

    return options.filter((option) =>
      [option.label, option.title, option.meta].some((value) =>
        value?.toLowerCase().includes(normalizedQuery),
      ),
    )
  }, [options, query])

  const groupedOptions = useMemo(() => {
    const orderedGroups: Array<{ id: string; title?: string; options: SearchableMultiSelectOption[] }> = []
    const groupIndex = new Map<string, number>()

    filteredOptions.forEach((option) => {
      const groupId = option.group?.trim() || '__ungrouped__'
      const existingIndex = groupIndex.get(groupId)

      if (existingIndex == null) {
        groupIndex.set(groupId, orderedGroups.length)
        orderedGroups.push({
          id: groupId,
          title: groupId === '__ungrouped__' ? undefined : option.group?.trim(),
          options: [option],
        })
        return
      }

      orderedGroups[existingIndex].options.push(option)
    })

    return orderedGroups
  }, [filteredOptions])

  const toggleOption = (nextValue: string) => {
    onChange(
      value.includes(nextValue)
        ? value.filter((currentValue) => currentValue !== nextValue)
        : [...value, nextValue],
    )
  }

  return (
    <Box style={rootStyle}>
      <Text id={labelId}>{label}</Text>
      <Input
        aria-controls={listboxId}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        style={inputStyle}
        value={query}
      />
      <Box
        aria-labelledby={labelId}
        aria-multiselectable="true"
        id={listboxId}
        role="listbox"
        style={optionsStyle}
      >
        {groupedOptions.map((group) => (
          <Box key={group.id} style={optionGroupStyle}>
            {group.title ? <Text style={optionGroupTitleStyle}>{group.title}</Text> : null}
            {group.options.map((option) => {
              const isSelected = value.includes(option.value)

              return (
                <Button
                  aria-selected={isSelected}
                  key={option.value}
                  onClick={() => toggleOption(option.value)}
                  role="option"
                  style={optionButtonStyle}
                >
                  <Box style={optionTextClusterStyle}>
                    <Text>{option.title ?? option.label}</Text>
                    {option.meta ? <Text style={optionMetaStyle}>{option.meta}</Text> : null}
                  </Box>
                  <Text style={{ ...optionActionStyle, ...(isSelected ? optionActionSelectedStyle : {}) }}>
                    {isSelected ? 'Selected' : 'Add'}
                  </Text>
                </Button>
              )
            })}
          </Box>
        ))}
        {groupedOptions.length === 0 ? <Text style={emptyStateStyle}>No matching options</Text> : null}
      </Box>
    </Box>
  )
}
