import type { ModalDescriptor } from '@/shared/model/modal'
import { useAppLocale } from '@/features/i18n/model/locale-provider'
import { AgentProviderSettingsWidget } from '@/widgets/settings/agent-provider-settings-widget'
import { SettingsShellWidget } from '@/widgets/settings/settings-shell-widget'

function AgentProvidersModalContent() {
  const { locale } = useAppLocale()
  return <AgentProviderSettingsWidget locale={locale} />
}

export function renderModalSettingsContent(modal: ModalDescriptor) {
  switch (modal.contentKey) {
    case 'settings-shell':
      return <SettingsShellWidget />
    case 'agent-providers':
      return <AgentProvidersModalContent />
    default:
      return <SettingsShellWidget />
  }
}
