import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/useGameStore'
import * as saveLoad from './utils/saveLoad'

type DevWindow = Window & {
  useGameStore?: typeof useGameStore
  saveLoad?: typeof saveLoad
}

if (import.meta.env.DEV) {
  const devWindow: DevWindow = window
  devWindow.useGameStore = useGameStore
  devWindow.saveLoad = saveLoad
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
