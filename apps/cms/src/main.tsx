import { createRoot } from 'react-dom/client'

import App from './App.tsx'

import { initSentry } from '@/lib/sentry'

import '@/i18n'
import './styles/index.css'

initSentry()

const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(<App />)
}
