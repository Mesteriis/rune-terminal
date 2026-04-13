import { useEffect, useRef, useState } from 'react'

type AgentComposerProps = {
  onSubmitPrompt: (prompt: string) => void | Promise<void>
}

export function AgentComposer({ onSubmitPrompt }: AgentComposerProps) {
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
    if (!prompt) {
      return
    }
    setDraft('')
    void onSubmitPrompt(prompt)
  }

  return (
    <div className="agent-composer-shell">
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            handleSubmit()
          }
        }}
        placeholder="Ask RunaTerminal AI about the active terminal..."
        rows={2}
      />
      <div className="agent-composer-footer">
        <span>Runtime-backed actions only until conversation transport lands.</span>
        <button className="ghost-button" onClick={handleSubmit} disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
