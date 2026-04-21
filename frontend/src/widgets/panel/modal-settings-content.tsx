import type { ModalDescriptor } from '@/shared/model/modal'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'
import { SettingsShellWidget } from '@/widgets/settings/settings-shell-widget'

export function renderModalSettingsContent(modal: ModalDescriptor) {
  switch (modal.contentKey) {
    case 'settings-shell':
      return <SettingsShellWidget />
    case 'agent-providers':
      return <AgentProviderSettingsWidget />
    default:
      return <SettingsShellWidget />
  }
}
