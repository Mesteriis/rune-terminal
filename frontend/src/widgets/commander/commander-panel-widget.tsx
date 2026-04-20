import { RunaDomScopeProvider } from '@/shared/ui/dom-id'

import { CommanderWidget } from '@/widgets/commander/commander-widget'

export function CommanderPanelWidget() {
  return (
    <RunaDomScopeProvider component="commander-panel-widget">
      <CommanderWidget />
    </RunaDomScopeProvider>
  )
}
