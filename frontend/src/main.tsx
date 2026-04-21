import '@xterm/xterm/css/xterm.css'
import 'dockview-react/dist/styles/dockview.css'
import '@/shared/ui/tokens/index.css'
import '@/index.css'

import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import { App } from '@/app/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('App root element #root was not found')
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
