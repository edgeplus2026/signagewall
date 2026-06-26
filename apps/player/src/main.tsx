import { render } from 'preact'

import { App } from './app'
import { initSentry } from './sentry'
import './styles.css'

initSentry()

const root = document.getElementById('app')
if (root) {
  render(<App />, root)
}
