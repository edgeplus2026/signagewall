import type { OneDrivePayload } from '../../src/onedrive/payload.js'
import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'

const root = document.getElementById('app')

function render(data: OneDrivePayload | null): void {
  if (!root) return
  if (!data || !data.url) {
    root.innerHTML = '<div class="center"><p>Loading document…</p></div>'
    return
  }
  if (data.kind === 'image') {
    const img = document.createElement('img')
    img.className = 'fill-frame'
    img.style.objectFit = 'contain'
    img.alt = data.name
    img.src = data.url
    root.replaceChildren(img)
    return
  }
  const frame = document.createElement('iframe')
  frame.className = 'fill-frame'
  frame.title = data.name
  frame.src = data.url
  root.replaceChildren(frame)
}

connectToHost<Record<string, unknown>, OneDrivePayload>(({ data }) => {
  render(data)
})
