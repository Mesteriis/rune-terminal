import { useId, useMemo, useState } from 'react'

import { Box, Button, Input, Text } from '@/shared/ui/primitives'

export type SearchableMultiSelectOption = {
  value: string
  label: string
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
  gap: 'var(--gap-sm)',
}

const optionsStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 'var(--gap-xs)',
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
  justifyContent: 'space-between',
  width: '100%',
}

const optionMetaStyle = {
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

    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
  }, [options, query])

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
        value={query}
      />
      <Box
        aria-labelledby={labelId}
        aria-multiselectable="true"
        id={listboxId}
        role="listbox"
        style={optionsStyle}
      >
        {filteredOptions.map((option) => {
          const isSelected = value.includes(option.value)

          return (
            <Button
              aria-selected={isSelected}
              key={option.value}
              onClick={() => toggleOption(option.value)}
              role="option"
              style={optionButtonStyle}
            >
              <Text>{option.label}</Text>
              <Text style={optionMetaStyle}>{isSelected ? 'Selected' : 'Add'}</Text>
            </Button>
          )
        })}
        {filteredOptions.length === 0 ? <Text>No matching options</Text> : null}
      </Box>
    </Box>
  )
}
