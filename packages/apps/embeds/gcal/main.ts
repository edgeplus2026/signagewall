import type { GcalPayload } from '../../src/gcal/payload.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

function escapeHtml(value: string): string {
  const div = document.createElement('div')
  div.textContent = value
  return div.innerHTML
}

function formatWhen(event: GcalPayload['events'][number]): string {
  const start = new Date(event.start)
  if (event.allDay) {
    return start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }
  return start.toLocaleString(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function render(data: GcalPayload | null): void {
  if (!root) return
  if (!data) {
    root.innerHTML = '<div class="center"><p>Loading calendar…</p></div>'
    return
  }
  if (data.events.length === 0) {
    root.innerHTML = `<div class="center"><div class="gc-head">${escapeHtml(data.calendarLabel)}</div><p>No upcoming events</p></div>`
    return
  }
  const rows = data.events
    .map(
      (event) =>
        `<li class="gc-item"><span class="gc-when">${escapeHtml(formatWhen(event))}</span><span class="gc-title">${escapeHtml(event.title)}</span></li>`,
    )
    .join('')
  root.innerHTML = `
    <div class="gc">
      <div class="gc-head">${escapeHtml(data.calendarLabel)}</div>
      <ul class="gc-list">${rows}</ul>
    </div>`
}

connectToHost<Record<string, unknown>, GcalPayload>(({ data }) => {
  render(data)
})
