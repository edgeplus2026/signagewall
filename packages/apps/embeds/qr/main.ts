import QRCode from 'qrcode'

import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

async function render(config: Record<string, unknown>): Promise<void> {
  if (!root) return
  const value = typeof config.value === 'string' ? config.value.trim() : ''
  const caption = typeof config.caption === 'string' ? config.caption.trim() : ''

  if (!value) {
    root.innerHTML = '<div class="center"><p>Set a QR value</p></div>'
    return
  }

  try {
    // Render at a high fixed resolution; CSS scales it to the surface crisply.
    const dataUrl = await QRCode.toDataURL(value, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
    const img = document.createElement('img')
    img.className = 'qr-img'
    img.alt = 'QR code'
    img.src = dataUrl

    const wrap = document.createElement('div')
    wrap.className = 'center'
    wrap.appendChild(img)
    if (caption) {
      const cap = document.createElement('div')
      cap.className = 'qr-caption'
      cap.textContent = caption
      wrap.appendChild(cap)
    }
    root.replaceChildren(wrap)
  } catch {
    root.innerHTML = '<div class="center"><p>Could not render QR code</p></div>'
  }
}

connectToHost(({ config }) => {
  void render(config)
})
