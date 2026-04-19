import '@xterm/xterm/css/xterm.css'
import 'dockview-react/dist/styles/dockview.css'
import './shared/ui/tokens/index.css'
import './index.css'

import ReactDOM from 'react-dom/client'

import { App } from './app/App'

function disablePageZoom() {
  const handleWheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault()
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    const isModifierPressed = event.ctrlKey || event.metaKey

    if (!isModifierPressed) {
      return
    }

    const key = event.key
    const code = event.code
    const blocksZoomShortcut =
      key === '+' ||
      key === '=' ||
      key === '-' ||
      key === '_' ||
      key === '0' ||
      code === 'NumpadAdd' ||
      code === 'NumpadSubtract' ||
      code === 'Numpad0'

    if (blocksZoomShortcut) {
      event.preventDefault()
    }
  }

  const handleGesture = (event: Event) => {
    event.preventDefault()
  }

  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('keydown', handleKeyDown, { capture: true })
  document.addEventListener('gesturestart', handleGesture, { passive: false })
  document.addEventListener('gesturechange', handleGesture, { passive: false })
  document.addEventListener('gestureend', handleGesture, { passive: false })
}

disablePageZoom()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
