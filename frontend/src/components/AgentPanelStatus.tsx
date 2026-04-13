import { ApprovalBar } from './ApprovalBar'
import { ExecutionNotice } from './ExecutionNotice'
import type { PendingApproval, RuntimeNotice } from '../types'

type AgentPanelStatusProps = {
  notice: RuntimeNotice | null
  pendingApproval: PendingApproval | null
  isConfirmingApproval: boolean
  onConfirmApproval: () => void | Promise<void>
  onDismissNotice: () => void
}

export function AgentPanelStatus({
  notice,
  pendingApproval,
  isConfirmingApproval,
  onConfirmApproval,
  onDismissNotice,
}: AgentPanelStatusProps) {
  if (!notice && !pendingApproval) {
    return null
  }

  return (
    <div className="agent-panel-status">
      {notice ? <ExecutionNotice notice={notice} onDismiss={onDismissNotice} /> : null}
      {pendingApproval ? (
        <ApprovalBar
          pendingApproval={pendingApproval}
          isConfirming={isConfirmingApproval}
          onConfirm={onConfirmApproval}
        />
      ) : null}
    </div>
  )
}
