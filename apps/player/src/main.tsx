import { render } from 'preact'

import { App } from './app'
import { reportAlive } from './native/updater'
import { initSentry } from './sentry'
import './styles.css'

initSentry()

// Tell the native shell the remote page's JS is running, BEFORE rendering — so
// "alive" reflects the WebView loading the bundle even if React then fails to
// render. The post-update watchdog uses this to tell a broken build (alive but
// never healthy) from an offline boot (never alive). No-op in a plain browser.
void reportAlive()

const root = document.getElementById('app')
if (root) {
  render(<App />, root)
}
