import { useEffect, useRef, useState } from 'react'

type AgentComposerProps = {
  hasTranscript: boolean
  isSubmitting?: boolean
  onSubmitPrompt: (prompt: string) => void | Promise<void>
  onAttachClick: () => void | Promise<void>
}

export function AgentComposer({ hasTranscript, isSubmitting = false, onSubmitPrompt, onAttachClick }: AgentComposerProps) {
  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) {
      return
    }
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 168)}px`
  }, [draft])

  function handleSubmit() {
    const prompt = draft.trim()
    if (!prompt || isSubmitting) {
      return
    }
    setDraft('')
    void onSubmitPrompt(prompt)
  }

  return (
    <div className="agent-composer-shell">
      <div className="agent-composer-input-wrap">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isSubmitting}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSubmit()
            }
          }}
          placeholder={
            isSubmitting
              ? 'Waiting for assistant…'
              : hasTranscript
                ? 'Continue the conversation or use /run <command>…'
                : 'Ask RunaTerminal AI anything or use /run <command>…'
          }
          rows={2}
        />
        <button
          className="agent-composer-icon agent-composer-attach"
          onClick={() => void onAttachClick()}
          type="button"
          title="Attach files"
        >
          <i className="fa fa-paperclip" />
        </button>
        <button
          className="agent-composer-icon agent-composer-send"
          onClick={handleSubmit}
          disabled={!draft.trim() || isSubmitting}
          type="button"
          title="Send message"
        >
          <i className="fa fa-paper-plane" />
        </button>
      </div>
      <div className="agent-composer-footer">
        <span>Enter to send · Shift+Enter for newline · /run &lt;command&gt; to execute in the active terminal</span>
      </div>
    </div>
  )
}
