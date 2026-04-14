import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useGameStore } from './store/useGameStore'

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).useGameStore = useGameStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
