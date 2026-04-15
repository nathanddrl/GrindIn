import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/useGameStore'
import * as saveLoad from './utils/saveLoad'

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>;
  w.useGameStore = useGameStore;
  w.saveLoad = saveLoad;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
