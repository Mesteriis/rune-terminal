import type { AgentProviderGatewayProvider } from '@/features/agent/api/provider-client'

export type AgentProviderGatewayRecoveryAction = {
  kind: 'probe' | 'prepare'
  label: string
}

export function getProviderGatewayRecoveryAction(
  provider: AgentProviderGatewayProvider | null | undefined,
): AgentProviderGatewayRecoveryAction | null {
  if (!provider || !provider.enabled) {
    return null
  }

  switch (provider.route_status_state?.trim()) {
    case '':
    case 'unchecked':
      return { kind: 'probe', label: 'Probe route' }
    case 'missing':
      return { kind: 'probe', label: 'Re-check binary' }
    case 'auth-required':
      return { kind: 'probe', label: 'Re-check auth' }
    case 'unreachable':
      return { kind: 'probe', label: 'Retry route probe' }
    case 'model-unavailable':
      return { kind: 'probe', label: 'Re-check models' }
  }

  switch (provider.last_error_code?.trim()) {
    case 'timeout':
    case 'unreachable':
    case 'upstream_rejected':
      return { kind: 'prepare', label: 'Retry route prepare' }
    case 'missing_binary':
      return { kind: 'probe', label: 'Re-check binary' }
    case 'auth_required':
      return { kind: 'probe', label: 'Re-check auth' }
    case 'model_unavailable':
      return { kind: 'probe', label: 'Re-check models' }
    case 'invalid_config':
      return { kind: 'probe', label: 'Re-check route' }
  }

  if (!provider.route_prepared || provider.route_prepare_state?.trim() !== 'prepared') {
    return { kind: 'prepare', label: 'Prepare route' }
  }

  return { kind: 'prepare', label: 'Refresh route' }
}

export function formatProviderGatewayErrorCode(errorCode?: string | null) {
  switch ((errorCode ?? '').trim()) {
    case 'missing_binary':
      return 'Binary missing'
    case 'auth_required':
      return 'Auth required'
    case 'timeout':
      return 'Timed out'
    case 'unreachable':
      return 'Route unreachable'
    case 'model_unavailable':
      return 'Model unavailable'
    case 'invalid_config':
      return 'Invalid config'
    case 'upstream_rejected':
      return 'Upstream rejected request'
    case 'stream_cancelled':
      return 'Cancelled'
    case 'provider_error':
      return 'Provider error'
    default:
      return ''
  }
}
