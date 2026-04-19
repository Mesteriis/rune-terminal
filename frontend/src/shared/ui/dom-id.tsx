import type { MutableRefObject, PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from 'react'

type RunaDomScope = {
  component: string
  layout: string
  widget: string
}

type RunaDomQuery = Partial<RunaDomScope> & {
  component?: string
}

const defaultScope: RunaDomScope = {
  layout: 'shell',
  widget: 'global',
  component: 'node',
}

const RunaDomScopeContext = createContext<RunaDomScope>(defaultScope)
let runaAutoUidCounter = 0

function slugifyRunaPart(value: string | undefined) {
  if (!value) {
    return 'node'
  }

  const normalizedValue = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalizedValue || 'node'
}

function shortUidFromReactId(value: string) {
  const normalizedValue = value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

  return (normalizedValue || 'node').slice(-6)
}

function nextAutoUid() {
  runaAutoUidCounter += 1

  return runaAutoUidCounter.toString(36).padStart(4, '0').slice(-4)
}

function inferComponentFromDataset(element: HTMLElement) {
  const runaDatasetEntries = Object.entries(element.dataset).filter(([key, value]) => (
    key.startsWith('runa')
    && key !== 'runaLayout'
    && key !== 'runaWidget'
    && key !== 'runaComponent'
    && key !== 'runaNode'
    && typeof value === 'string'
    && value !== ''
  ))

  if (runaDatasetEntries.length === 0) {
    return null
  }

  const [datasetKey] = runaDatasetEntries[0]
  const normalizedKey = datasetKey.replace(/^runa/, '')

  return normalizedKey || null
}

function inferComponentName(element: HTMLElement, fallbackComponent: string) {
  const explicitComponent = element.getAttribute('data-runa-component')

  if (explicitComponent) {
    return explicitComponent
  }

  const runaDataComponent = inferComponentFromDataset(element)

  if (runaDataComponent) {
    return runaDataComponent
  }

  const ariaLabel = element.getAttribute('aria-label')

  if (ariaLabel) {
    return ariaLabel
  }

  const name = element.getAttribute('name')

  if (name) {
    return name
  }

  const role = element.getAttribute('role')

  if (role) {
    return role
  }

  if (element.classList.length > 0) {
    return Array.from(element.classList).join('-')
  }

  return fallbackComponent || element.tagName.toLowerCase()
}

function applyRunaElementIdentity(
  element: HTMLElement,
  scope: RunaDomScope,
  explicitComponent?: string,
) {
  const component = slugifyRunaPart(explicitComponent ?? inferComponentName(element, scope.component))
  const node = buildRunaNodeKey({
    component,
    layout: scope.layout,
    widget: scope.widget,
  })
  const existingAutoUid = element.getAttribute('data-runa-auto-uid')
  const shortUid = existingAutoUid ?? nextAutoUid()

  element.setAttribute('data-runa-auto-uid', shortUid)
  element.setAttribute('data-runa-layout', scope.layout)
  element.setAttribute('data-runa-widget', scope.widget)
  element.setAttribute('data-runa-component', component)
  element.setAttribute('data-runa-node', node)

  if (!element.id) {
    element.id = `${node}-${shortUid}`
  }
}

function tagRunaSubtree(root: HTMLElement, scope: RunaDomScope, rootComponent?: string) {
  applyRunaElementIdentity(root, scope, rootComponent)

  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    if (element.dataset.runaNode && element.id) {
      return
    }

    applyRunaElementIdentity(element, scope)
  })
}

export function buildRunaNodeKey({ component, layout, widget }: RunaDomQuery) {
  return [
    slugifyRunaPart(layout ?? defaultScope.layout),
    slugifyRunaPart(widget ?? defaultScope.widget),
    slugifyRunaPart(component ?? defaultScope.component),
  ].join('-')
}

export function buildRunaNodeSelector(query: RunaDomQuery) {
  return `[data-runa-node="${buildRunaNodeKey(query)}"]`
}

export function findRunaNode(query: RunaDomQuery, root: ParentNode = document) {
  return root.querySelector(buildRunaNodeSelector(query))
}

export function findRunaNodes(query: RunaDomQuery, root: ParentNode = document) {
  return Array.from(root.querySelectorAll(buildRunaNodeSelector(query)))
}

export type RunaDomScopeProviderProps = PropsWithChildren<{
  component?: string
  layout?: string
  widget?: string
}>

export function RunaDomScopeProvider({
  children,
  component,
  layout,
  widget,
}: RunaDomScopeProviderProps) {
  const parentScope = useContext(RunaDomScopeContext)
  const value = useMemo<RunaDomScope>(
    () => ({
      layout: slugifyRunaPart(layout ?? parentScope.layout),
      widget: slugifyRunaPart(widget ?? parentScope.widget),
      component: slugifyRunaPart(component ?? parentScope.component),
    }),
    [component, layout, parentScope.component, parentScope.layout, parentScope.widget, widget],
  )

  return <RunaDomScopeContext.Provider value={value}>{children}</RunaDomScopeContext.Provider>
}

export function useRunaDomScope() {
  return useContext(RunaDomScopeContext)
}

export function useRunaDomIdentity(componentName: string, explicitId?: string) {
  const scope = useRunaDomScope()
  const reactId = useId()
  const component = slugifyRunaPart(componentName)
  const node = buildRunaNodeKey({
    component,
    layout: scope.layout,
    widget: scope.widget,
  })

  return {
    id: explicitId ?? `${node}-${shortUidFromReactId(reactId)}`,
    node,
    scope: {
      component,
      layout: scope.layout,
      widget: scope.widget,
    },
  }
}

export function useRunaDomAutoTagging(rootComponent?: string) {
  const scope = useRunaDomScope()
  const observerRef = useRef<MutationObserver | null>(null)
  const nodeRef = useRef<HTMLElement | null>(null)

  const disconnectObserver = useCallback(() => {
    observerRef.current?.disconnect()
    observerRef.current = null
  }, [])

  const attachObserver = useCallback((node: HTMLElement | null) => {
    disconnectObserver()
    nodeRef.current = node

    if (!node || typeof MutationObserver === 'undefined') {
      return
    }

    tagRunaSubtree(node, scope, rootComponent)

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((addedNode) => {
          if (!(addedNode instanceof HTMLElement)) {
            return
          }

          tagRunaSubtree(addedNode, scope)
        })
      })
    })

    observer.observe(node, { childList: true, subtree: true })
    observerRef.current = observer
  }, [disconnectObserver, rootComponent, scope])

  useEffect(() => {
    if (nodeRef.current) {
      tagRunaSubtree(nodeRef.current, scope, rootComponent)
    }
  }, [rootComponent, scope])

  useEffect(() => disconnectObserver, [disconnectObserver])

  return attachObserver
}

export function useRunaDomAutoTaggingRef<T extends HTMLElement>(rootComponent?: string) {
  return useRunaDomAutoTagging(rootComponent) as MutableRefObject<T | null> | ((node: T | null) => void)
}
