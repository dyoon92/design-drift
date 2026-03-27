import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LandingPage } from './landing/LandingPage.tsx'

const isDemo = new URLSearchParams(window.location.search).has('demo')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDemo ? <App /> : <LandingPage />}
  </StrictMode>,
)
