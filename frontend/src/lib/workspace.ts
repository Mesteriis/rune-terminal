import type { BootstrapPayload, Connection, ConnectionCatalog, Tab, Widget, Workspace } from '../types'

export function normalizeBootstrapPayload(payload: BootstrapPayload): BootstrapPayload {
  return {
    ...payload,
    workspace: normalizeWorkspace(payload.workspace),
    connections: normalizeConnectionCatalog(payload.connections),
    tools: Array.isArray(payload.tools) ? payload.tools : [],
    repo_root: typeof payload.repo_root === 'string' ? payload.repo_root : '',
  }
}

export function normalizeWorkspace(workspace: Workspace | null | undefined): Workspace {
  const widgets = Array.isArray(workspace?.widgets) ? workspace.widgets : []
  const fallbackTabs = buildFallbackTabs(widgets)
  const tabs = Array.isArray(workspace?.tabs) && workspace.tabs.length > 0 ? workspace.tabs.map(normalizeTab) : fallbackTabs

  const activeWidgetID = resolveActiveWidgetID(workspace?.active_widget_id, widgets, tabs)
  const activeTabID = resolveActiveTabID(workspace?.active_tab_id, tabs, activeWidgetID)

  return {
    id: typeof workspace?.id === 'string' && workspace.id.length > 0 ? workspace.id : 'default',
    name: typeof workspace?.name === 'string' && workspace.name.length > 0 ? workspace.name : 'Workspace',
    tabs,
    active_tab_id: activeTabID,
    widgets,
    active_widget_id: activeWidgetID,
  }
}

function buildFallbackTabs(widgets: Widget[]): Tab[] {
  return widgets.map((widget) => ({
    id: `tab-${widget.id}`,
    title: widget.title || 'Terminal',
    description: widget.description,
    pinned: false,
    widget_ids: [widget.id],
  }))
}

function normalizeTab(tab: Tab): Tab {
  return {
    ...tab,
    title: typeof tab.title === 'string' && tab.title.length > 0 ? tab.title : 'Tab',
    pinned: Boolean(tab.pinned),
    widget_ids: Array.isArray(tab.widget_ids) ? tab.widget_ids : [],
  }
}

function resolveActiveWidgetID(
  requestedWidgetID: string | undefined,
  widgets: Widget[],
  tabs: Tab[],
): string {
  if (requestedWidgetID && widgets.some((widget) => widget.id === requestedWidgetID)) {
    return requestedWidgetID
  }

  for (const tab of tabs) {
    const widgetID = tab.widget_ids.find((id) => widgets.some((widget) => widget.id === id))
    if (widgetID) {
      return widgetID
    }
  }

  return widgets[0]?.id ?? ''
}

function resolveActiveTabID(
  requestedTabID: string | undefined,
  tabs: Tab[],
  activeWidgetID: string,
): string {
  if (requestedTabID && tabs.some((tab) => tab.id === requestedTabID)) {
    return requestedTabID
  }

  const widgetTab = tabs.find((tab) => tab.widget_ids.includes(activeWidgetID))
  if (widgetTab) {
    return widgetTab.id
  }

  return tabs[0]?.id ?? ''
}

export function normalizeConnectionCatalog(catalog: ConnectionCatalog | null | undefined): ConnectionCatalog {
  const connections = Array.isArray(catalog?.connections) ? catalog.connections.map(normalizeConnection) : []
  const activeConnectionID =
    typeof catalog?.active_connection_id === 'string' && connections.some((connection) => connection.id === catalog.active_connection_id)
      ? catalog.active_connection_id
      : connections.find((connection) => connection.active)?.id ?? connections[0]?.id ?? 'local'
  return {
    connections,
    active_connection_id: activeConnectionID,
  }
}

function normalizeConnection(connection: Connection): Connection {
  return {
    ...connection,
    name: typeof connection.name === 'string' && connection.name.length > 0 ? connection.name : 'Connection',
    description: typeof connection.description === 'string' ? connection.description : '',
    active: Boolean(connection.active),
    usability:
      connection.usability === 'available' || connection.usability === 'attention' || connection.usability === 'unknown'
        ? connection.usability
        : connection.kind === 'local'
          ? 'available'
          : 'unknown',
    runtime: {
      check_status:
        connection.runtime?.check_status === 'passed' || connection.runtime?.check_status === 'failed'
          ? connection.runtime.check_status
          : connection.kind === 'local'
            ? 'passed'
            : 'unchecked',
      check_error: typeof connection.runtime?.check_error === 'string' ? connection.runtime.check_error : '',
      last_checked_at:
        typeof connection.runtime?.last_checked_at === 'string' ? connection.runtime.last_checked_at : undefined,
      launch_status:
        connection.runtime?.launch_status === 'succeeded' || connection.runtime?.launch_status === 'failed'
          ? connection.runtime.launch_status
          : 'idle',
      launch_error: typeof connection.runtime?.launch_error === 'string' ? connection.runtime.launch_error : '',
      last_launched_at:
        typeof connection.runtime?.last_launched_at === 'string' ? connection.runtime.last_launched_at : undefined,
    },
  }
}
