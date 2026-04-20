import { RunaDomScopeProvider } from '@/shared/ui/dom-id'

import { CommanderWidget } from '@/widgets/commander/commander-widget'

/** Wraps the commander widget with its Dockview/panel-level DOM scope. */
export function CommanderPanelWidget() {
  return (
    <RunaDomScopeProvider component="commander-panel-widget">
      <CommanderWidget />
    </RunaDomScopeProvider>
  )
}
