import type { IDockviewPanelProps } from 'dockview-react'

export function AiPanel(props: IDockviewPanelProps) {
  return <div>AI PANEL: {props.api.id}</div>
}
