import type { ModalDescriptor } from '@/shared/model/modal'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'

export function renderModalSettingsContent(modal: ModalDescriptor) {
  switch (modal.contentKey) {
    case 'agent-providers':
      return <AgentProviderSettingsWidget />
    default:
      return null
  }
}
