import { type AgentConversationProvider } from '@/features/agent/api/client'
import {
  clearAgentProviderRouteState,
  fetchAgentProviderGatewaySnapshot,
  prewarmAgentProvider,
  probeAgentProvider,
  setActiveAgentProvider as activateAgentProviderInCatalog,
  type AgentProviderCatalog,
  type AgentProviderGatewayProvider,
  type AgentProviderGatewayRun,
  type AgentProviderGatewaySnapshot,
  type AgentProviderView,
} from '@/features/agent/api/provider-client'
import {
  directProviderChatModels,
  directProviderDefaultModel,
  providerViewToConversationProvider,
  selectPreferredChatModel,
} from '@/features/agent/model/agent-panel-provider'
import { getErrorMessage } from '@/features/agent/model/agent-panel-terminal'

type ProviderRuntimeDeps = {
  activateAgentProviderInCatalog: typeof activateAgentProviderInCatalog
  clearAgentProviderRouteState: typeof clearAgentProviderRouteState
  directProviderChatModels: typeof directProviderChatModels
  directProviderDefaultModel: typeof directProviderDefaultModel
  fetchAgentProviderGatewaySnapshot: typeof fetchAgentProviderGatewaySnapshot
  getErrorMessage: typeof getErrorMessage
  prewarmAgentProvider: typeof prewarmAgentProvider
  probeAgentProvider: typeof probeAgentProvider
  providerViewToConversationProvider: typeof providerViewToConversationProvider
  selectPreferredChatModel: typeof selectPreferredChatModel
}

const defaultDeps: ProviderRuntimeDeps = {
  activateAgentProviderInCatalog,
  clearAgentProviderRouteState,
  directProviderChatModels,
  directProviderDefaultModel,
  fetchAgentProviderGatewaySnapshot,
  getErrorMessage,
  prewarmAgentProvider,
  probeAgentProvider,
  providerViewToConversationProvider,
  selectPreferredChatModel,
}

type RefreshProviderGatewaySnapshotInput = {
  setIsProviderGatewayPending: (pending: boolean) => void
  setProviderGateway: (snapshot: AgentProviderGatewaySnapshot | null) => void
  setProviderGatewayError: (error: string | null) => void
  suppressError?: boolean
}

export async function refreshProviderGatewaySnapshotForPanel(
  input: RefreshProviderGatewaySnapshotInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  input.setIsProviderGatewayPending(true)
  try {
    const snapshot = await deps.fetchAgentProviderGatewaySnapshot()
    input.setProviderGateway(snapshot)
    input.setProviderGatewayError(null)
    return snapshot
  } catch (error) {
    if (!input.suppressError) {
      input.setProviderGatewayError(deps.getErrorMessage(error, 'Unable to load provider gateway telemetry.'))
    }
    return null
  } finally {
    input.setIsProviderGatewayPending(false)
  }
}

type RefreshActiveProviderHistoryInput = {
  activeProviderID: string
  providerID?: string
  setActiveProviderHistoryError: (error: string | null) => void
  setActiveProviderHistoryRuns: (runs: AgentProviderGatewayRun[]) => void
  setActiveProviderHistoryTotal: (total: number) => void
  setIsActiveProviderHistoryPending: (pending: boolean) => void
  suppressError?: boolean
}

export async function refreshActiveProviderHistoryForPanel(
  input: RefreshActiveProviderHistoryInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  const providerID = (input.providerID ?? input.activeProviderID).trim()

  if (!providerID) {
    input.setActiveProviderHistoryRuns([])
    input.setActiveProviderHistoryTotal(0)
    input.setActiveProviderHistoryError(null)
    input.setIsActiveProviderHistoryPending(false)
    return []
  }

  input.setIsActiveProviderHistoryPending(true)

  try {
    const snapshot = await deps.fetchAgentProviderGatewaySnapshot({
      providerID,
      limit: 3,
    })
    input.setActiveProviderHistoryRuns(snapshot.recent_runs)
    input.setActiveProviderHistoryTotal(snapshot.recent_runs_total)
    input.setActiveProviderHistoryError(null)
    return snapshot.recent_runs
  } catch (error) {
    input.setActiveProviderHistoryRuns([])
    input.setActiveProviderHistoryTotal(0)
    if (!input.suppressError) {
      input.setActiveProviderHistoryError(
        deps.getErrorMessage(error, 'Unable to load the recent route activity for the active provider.'),
      )
    }
    return []
  } finally {
    input.setIsActiveProviderHistoryPending(false)
  }
}

type SelectProviderInput = {
  beginPanelStateEpoch: () => number
  getPanelStateEpoch: () => number
  provider: AgentConversationProvider | null
  providerID: string
  refreshProviderGatewaySnapshot: (options?: { suppressError?: boolean }) => Promise<unknown>
  selectedProviderID: string
  setAvailableModels: (models: string[]) => void
  setLoadError: (error: string | null) => void
  setProvider: (
    provider:
      | AgentConversationProvider
      | null
      | ((currentProvider: AgentConversationProvider | null) => AgentConversationProvider | null),
  ) => void
  setProviderCatalog: (catalog: AgentProviderCatalog) => void
  setSelectedModel: (model: string) => void
  setSelectedProviderID: (providerID: string) => void
  setSubmitError: (error: string | null) => void
}

export async function selectProviderForPanel(
  input: SelectProviderInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  const nextProviderID = input.providerID.trim()
  if (!nextProviderID || nextProviderID === input.selectedProviderID) {
    return
  }

  const panelStateEpoch = input.beginPanelStateEpoch()

  try {
    input.setLoadError(null)
    input.setSubmitError(null)

    const nextCatalog = await deps.activateAgentProviderInCatalog(nextProviderID)
    if (input.getPanelStateEpoch() !== panelStateEpoch) {
      return
    }
    const nextProvider =
      nextCatalog.providers.find((candidate) => candidate.id === nextCatalog.active_provider_id) ?? null
    const nextModels = deps.directProviderChatModels(nextProvider)

    input.setProviderCatalog(nextCatalog)
    input.setSelectedProviderID(nextProvider?.id ?? nextProviderID)
    input.setAvailableModels(nextModels)
    input.setSelectedModel(
      deps.selectPreferredChatModel('', deps.directProviderDefaultModel(nextProvider), nextModels),
    )
    input.setProvider(deps.providerViewToConversationProvider(nextProvider, input.provider))
    await input.refreshProviderGatewaySnapshot({ suppressError: true })
  } catch (error) {
    input.setSubmitError(deps.getErrorMessage(error, 'Unable to switch the active AI provider.'))
  }
}

type RouteActionInput = {
  activeProviderID: string
  isProviderGatewayPending?: boolean
  isProviderRoutePreparing: boolean
  isProviderRouteProbing: boolean
  refreshProviderGatewaySnapshot: (options?: { suppressError?: boolean }) => Promise<unknown>
  setIsProviderRoutePreparing: (pending: boolean) => void
  setIsProviderRouteProbing: (pending: boolean) => void
  setProviderGatewayError: (error: string | null) => void
}

export async function prewarmActiveProviderRouteForPanel(
  input: RouteActionInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  const providerID = input.activeProviderID
  if (!providerID || input.isProviderRoutePreparing) {
    return
  }

  input.setProviderGatewayError(null)
  input.setIsProviderRoutePreparing(true)
  try {
    await deps.prewarmAgentProvider(providerID)
    await input.refreshProviderGatewaySnapshot({ suppressError: true })
  } catch (error) {
    input.setProviderGatewayError(deps.getErrorMessage(error, 'Unable to prepare the active provider route.'))
  } finally {
    input.setIsProviderRoutePreparing(false)
  }
}

export async function probeActiveProviderRouteForPanel(
  input: RouteActionInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  const providerID = input.activeProviderID
  if (!providerID || input.isProviderRouteProbing) {
    return
  }

  input.setProviderGatewayError(null)
  input.setIsProviderRouteProbing(true)
  try {
    await deps.probeAgentProvider(providerID)
    await input.refreshProviderGatewaySnapshot({ suppressError: true })
  } catch (error) {
    input.setProviderGatewayError(deps.getErrorMessage(error, 'Unable to probe the active provider route.'))
  } finally {
    input.setIsProviderRouteProbing(false)
  }
}

export async function clearActiveProviderRouteStateForPanel(
  input: RouteActionInput,
  deps: ProviderRuntimeDeps = defaultDeps,
) {
  const providerID = input.activeProviderID
  if (
    !providerID ||
    input.isProviderGatewayPending ||
    input.isProviderRoutePreparing ||
    input.isProviderRouteProbing
  ) {
    return
  }

  input.setProviderGatewayError(null)
  try {
    await deps.clearAgentProviderRouteState(providerID)
    await input.refreshProviderGatewaySnapshot({ suppressError: true })
  } catch (error) {
    input.setProviderGatewayError(
      deps.getErrorMessage(error, 'Unable to clear the active provider route state.'),
    )
  }
}

export function resolveActiveProviderGateway(
  providerGateway: AgentProviderGatewaySnapshot | null,
  activeProviderID: string,
) {
  if (!providerGateway) {
    return null
  }
  if (!activeProviderID) {
    return providerGateway.providers.find((candidate) => candidate.active) ?? null
  }
  return providerGateway.providers.find((candidate) => candidate.provider_id === activeProviderID) ?? null
}

export function findCatalogActiveProvider(
  providerCatalog: AgentProviderCatalog | null,
): AgentProviderView | null {
  if (!providerCatalog) {
    return null
  }
  return (
    providerCatalog.providers.find((candidate) => candidate.id === providerCatalog.active_provider_id) ?? null
  )
}

export function findGatewayActiveProvider(
  providerGateway: AgentProviderGatewaySnapshot | null,
  activeProviderID: string,
): AgentProviderGatewayProvider | null {
  return resolveActiveProviderGateway(providerGateway, activeProviderID)
}
