type SemanticComponentOptions = {
  ariaLabel?: string
  fallbackCandidates?: Array<string | undefined>
  fallbackComponent: string
  runaComponent?: string
}

export function resolveSemanticComponent({
  ariaLabel,
  fallbackCandidates = [],
  fallbackComponent,
  runaComponent,
}: SemanticComponentOptions) {
  if (typeof runaComponent === 'string' && runaComponent.trim() !== '') {
    return runaComponent
  }

  if (typeof ariaLabel === 'string' && ariaLabel.trim() !== '') {
    return ariaLabel
  }

  for (const candidate of fallbackCandidates) {
    if (typeof candidate === 'string' && candidate.trim() !== '') {
      return candidate
    }
  }

  return fallbackComponent
}
