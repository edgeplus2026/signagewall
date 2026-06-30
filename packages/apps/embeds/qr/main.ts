import QRCode from 'qrcode'

import { connectToHost } from '../_shared/host-bridge.js'
import '../_shared/base.css'
import './style.css'

const root = document.getElementById('app')

/** A hex color; anything else falls back to the default. */
const HEX = /^#[0-9a-fA-F]{3,8}$/
function pickColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && HEX.test(value) ? value : fallback
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Escape Wi-Fi QR special characters (`\ ; , : "`) per the WIFI: spec. */
function wifiEscape(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1')
}

/**
 * Build the QR payload string from the chosen type. Each type encodes to the
 * standard scheme scanners recognize (tel:/SMSTO:/mailto:/WIFI:/review URL).
 * Returns '' when the required value is missing (→ "Set a QR value").
 */
function buildPayload(config: Record<string, unknown>): string {
  switch (str(config.qrType) || 'url') {
    case 'phone': {
      const phone = str(config.phone)
      return phone ? `tel:${phone}` : ''
    }
    case 'sms': {
      const number = str(config.smsPhone)
      return number ? `SMSTO:${number}:${str(config.smsMessage)}` : ''
    }
    case 'email': {
      const to = str(config.emailTo)
      if (!to) return ''
      const params = new URLSearchParams()
      if (str(config.emailSubject)) params.set('subject', str(config.emailSubject))
      if (str(config.emailBody)) params.set('body', str(config.emailBody))
      const query = params.toString()
      return `mailto:${to}${query ? `?${query}` : ''}`
    }
    case 'wifi': {
      const ssid = str(config.wifiSsid)
      if (!ssid) return ''
      const security = str(config.wifiSecurity) || 'WPA'
      const hidden = config.wifiHidden === true ? 'H:true;' : ''
      const password =
        security === 'nopass'
          ? ''
          : `P:${wifiEscape(str(config.wifiPassword))};`
      return `WIFI:T:${security};S:${wifiEscape(ssid)};${password}${hidden};`
    }
    case 'review': {
      const placeId = str(config.reviewPlaceId)
      return placeId
        ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
        : ''
    }
    case 'url':
    default: {
      const url = str(config.value)
      if (!url) return ''
      // Prepend a scheme so a bare host still scans as a link.
      return /^[a-z][\w+.-]*:/i.test(url) ? url : `https://${url}`
    }
  }
}

async function render(config: Record<string, unknown>): Promise<void> {
  if (!root) return
  const value = buildPayload(config)
  const caption = typeof config.caption === 'string' ? config.caption.trim() : ''
  const dark = pickColor(config.color, '#000000')
  const light = pickColor(config.backgroundColor, '#ffffff')

  root.style.background = light

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
      color: { dark, light },
    })
    const img = document.createElement('img')
    img.className = 'qr-img'
    img.alt = 'QR code'
    img.src = dataUrl
    img.style.background = light

    const wrap = document.createElement('div')
    wrap.className = 'center'
    wrap.appendChild(img)
    if (caption) {
      const cap = document.createElement('div')
      cap.className = 'qr-caption'
      cap.textContent = caption
      cap.style.color = dark
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
