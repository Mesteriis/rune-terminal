import type { RuntimeNotice } from '../types'

type ExecutionNoticeProps = {
  notice: RuntimeNotice
  onDismiss: () => void
}

export function ExecutionNotice({ notice, onDismiss }: ExecutionNoticeProps) {
  return (
    <section className={`notice-banner notice-${notice.tone}`}>
      <div>
        <p className="eyebrow">Runtime notice</p>
        <strong>{notice.title}</strong>
        {notice.detail ? <span>{notice.detail}</span> : null}
      </div>
      <button className="ghost-button" onClick={onDismiss}>
        Dismiss
      </button>
    </section>
  )
}
