import { useEffect, useState } from 'react'

import { RtermClient } from '../lib/api'
import { resolveRuntimeInfo } from '../lib/runtime'
import type { AgentCatalog, AuditEvent, BootstrapPayload, ToolInfo, Workspace } from '../types'

export function useRuntimeBootstrap() {
  const [client, setClient] = useState<RtermClient | null>(null)
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [repoRoot, setRepoRoot] = useState('')
  const [tools, setTools] = useState<ToolInfo[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [agentCatalog, setAgentCatalog] = useState<AgentCatalog | null>(null)
  const [runtimeError, setRuntimeError] = useState<string | null>(null)

  function applyBootstrap(payload: BootstrapPayload) {
    setWorkspace(payload.workspace)
    setRepoRoot(payload.repo_root)
    setTools(payload.tools ?? [])
  }

  useEffect(() => {
    async function boot() {
      try {
        const runtime = await resolveRuntimeInfo()
        const nextClient = new RtermClient(runtime)
        setClient(nextClient)
        const [bootstrap, audit, agent] = await Promise.all([
          nextClient.bootstrap(),
          nextClient.audit(),
          nextClient.agentCatalog(),
        ])
        applyBootstrap(bootstrap)
        setAuditEvents(audit.events ?? [])
        setAgentCatalog(agent)
      } catch (error) {
        setRuntimeError(formatError(error))
      }
    }
    void boot()
  }, [])

  return {
    client,
    workspace,
    repoRoot,
    tools,
    auditEvents,
    agentCatalog,
    runtimeError,
    setWorkspace,
    setRepoRoot,
    setTools,
    setAuditEvents,
    setAgentCatalog,
    applyBootstrap,
  }
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}
