import QRCode from 'qrcode'

import { pickColor } from './color.js'

/**
 * Shared QR rendering for embed apps. The `qr` app draws a code as its whole
 * purpose; `rss` puts one beside the story on screen. Both want the same thing:
 * a data URL, rendered big enough that CSS can scale it to any surface without
 * softening the modules.
 *
 * `qrcode` is a devDependency of this package — Vite bundles it into whichever
 * embed imports it, so it never becomes a runtime dependency of the player.
 */

export interface QrOptions {
  /** The code's modules. */
  dark?: string
  /** The quiet zone / background behind the code. */
  light?: string
}

/**
 * Encode `value` as a QR code data URL, or `null` when it can't be encoded (an
 * empty value, or a string too long for a QR code). Callers render a fallback
 * rather than an empty frame.
 *
 * Rendered at a high fixed resolution; CSS scales it down to the surface crisply.
 */
export async function qrDataUrl(
  value: string,
  options: QrOptions = {},
): Promise<string | null> {
  if (!value) {
    return null
  }
  try {
    return await QRCode.toDataURL(value, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: pickColor(options.dark, '#000000'),
        light: pickColor(options.light, '#ffffff'),
      },
    })
  } catch {
    return null
  }
}
