import type { AppManifest } from '@signagewall/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const ALERT_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>'

/**
 * Emergency Alert — a `static`, full-screen high-visibility message for
 * evacuations, closures and warnings. Pure client-side and it does NOT set
 * `requiresNetwork`: an alert that only shows when the internet is up is the
 * opposite of what it's for — this keeps working on a screen that's been offline.
 *
 * It is an OVERLAY, and specifically a `takeover`: it does not wait its turn in
 * the rotation. That was the whole problem with the first version — an alert
 * queued behind a twenty-item playlist reaches the screen four minutes after the
 * fire alarm, which is the same as not reaching it. Now the operator flips one
 * switch and every screen they picked shows it within a second, including screens
 * that are dark because they are outside working hours.
 *
 * `active` is deliberately its own field rather than something derived from the
 * text being filled in. An alert is written and assigned in calm conditions and
 * left switched off; the emergency is one toggle, not a form.
 *
 * `severity` picks a whole look (colour + icon) rather than exposing loose
 * colour fields; the layout (huge headline, optional slow pulsing edge) is the
 * app's job to get right so it reads across a room at a glance. The pulse is a
 * deliberately slow (~0.6 Hz) edge fade — well under any photosensitivity
 * threshold — and is disabled entirely under `prefers-reduced-motion`.
 */
export const alertManifest: AppManifest = {
  slug: 'alert',
  name: 'Emergency Alert',
  tagline: 'Full-screen urgent message',
  description:
    'Show a high-visibility alert full-screen: a headline, optional details and a severity colour. Works offline.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 3,
  overlay: true,
  takeover: true,
  icon: ALERT_ICON,
  color: '#DC2626',
  configSchema: [
    {
      key: 'active',
      type: 'switch',
      label: 'Show this alert now',
      default: false,
      help: 'Off, this costs the screens nothing. On, it covers them within a second — including screens that are currently outside their working hours.',
    },
    {
      key: 'screens',
      type: 'screens',
      label: 'Show on screens',
      help: 'Every screen picked here is taken over while the alert is on.',
    },
    {
      key: 'headline',
      type: 'text',
      label: 'Headline',
      required: true,
      placeholder: 'Evacuate the building',
      help: 'The main message. Keep it short so it reads from across the room.',
    },
    {
      key: 'message',
      type: 'textarea',
      label: 'Details',
      help: 'Optional supporting detail shown under the headline.',
    },
    {
      key: 'severity',
      type: 'select',
      label: 'Severity',
      help: 'Sets the colour and icon.',
      default: 'critical',
      options: [
        { label: 'Critical (red)', value: 'critical' },
        { label: 'Warning (amber)', value: 'warning' },
        { label: 'Information (blue)', value: 'info' },
      ],
    },
    {
      key: 'showIcon',
      type: 'switch',
      label: 'Show icon',
      default: true,
    },
    {
      key: 'pulse',
      type: 'switch',
      label: 'Pulsing edge',
      help: 'A slow pulsing border to draw the eye (no rapid flashing).',
      default: true,
    },
    // Defaults mirror the app's designed look (heavy headline, roomy detail
    // lines) so an untouched form changes nothing.
    ...styleFields({ fontWeight: '800', lineHeight: 1.25 }),
  ],
}
