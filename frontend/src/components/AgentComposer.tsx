import { useEffect, useRef, useState } from 'react'

type AgentComposerProps = {
  onSubmitPrompt: (prompt: string) => void | Promise<void>
  onAttachClick: () => void | Promise<void>
}

const PROMPT_CHIPS = ['Inspect terminal', 'List tabs', 'List widgets', 'Show active tab']

export function AgentComposer({ onSubmitPrompt, onAttachClick }: AgentComposerProps) {
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
      <div className="agent-composer-toolbar">
        <button className="ghost-button compact-button" onClick={() => void onAttachClick()} type="button">
          Attach
        </button>
        <div className="agent-composer-chip-row">
          {PROMPT_CHIPS.map((chip) => (
            <button
              key={chip}
              className="agent-composer-chip"
              type="button"
              onClick={() => void onSubmitPrompt(chip)}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
      <div className="agent-composer-footer">
        <span>Runtime-backed actions only until conversation transport lands.</span>
        <button className="ghost-button" onClick={handleSubmit} disabled={!draft.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
