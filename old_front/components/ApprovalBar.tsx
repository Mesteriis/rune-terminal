import type { PendingApproval } from '../types'

type ApprovalBarProps = {
  pendingApproval: PendingApproval
  isConfirming?: boolean
  onConfirm: () => void | Promise<void>
}

export function ApprovalBar({ pendingApproval, isConfirming, onConfirm }: ApprovalBarProps) {
  return (
    <section className="approval-bar">
      <div>
        <p className="eyebrow">Approval required</p>
        <strong>{pendingApproval.tool_name}</strong>
        <span>{pendingApproval.summary}</span>
      </div>
      <button onClick={() => void onConfirm()} disabled={isConfirming}>
        {isConfirming ? 'Confirming…' : 'Confirm and continue'}
      </button>
    </section>
  )
}
