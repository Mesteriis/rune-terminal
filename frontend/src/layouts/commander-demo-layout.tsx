import { RunaDomScopeProvider } from '../shared/ui/dom-id'
import { CommanderWidget } from '../widgets/commander-widget'

export function CommanderDemoLayout() {
  return (
    <RunaDomScopeProvider component="commander-demo-layout">
      <CommanderWidget />
    </RunaDomScopeProvider>
  )
}
