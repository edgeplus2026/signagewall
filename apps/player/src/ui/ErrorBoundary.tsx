import { Component, type ComponentChildren } from 'preact'

import { reportError } from '../sentry'

interface Props {
  children: ComponentChildren
}

interface State {
  crashed: boolean
}

const RELOAD_DELAY_MS = 5_000

/**
 * Last line of defence for an unattended screen: if the UI tree throws, report
 * it and self-heal by reloading after a short delay rather than leaving a dead
 * screen until someone physically intervenes.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  componentDidCatch(error: unknown): void {
    reportError(error, { boundary: 'root' })
    this.setState({ crashed: true })
    window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS)
  }

  render() {
    if (this.state.crashed) {
      return (
        <div class="player-fallback">
          <div class="player-fallback__brand">Edge</div>
          <div class="player-fallback__hint">Recovering…</div>
        </div>
      )
    }
    return this.props.children
  }
}
