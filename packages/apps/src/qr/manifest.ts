import type { AppManifest } from '@edge/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>'

/**
 * QR code — turns any URL/text into a scannable code (menus, promos,
 * contactless). Pure client-side: the code is generated in the browser.
 */
export const qrManifest: AppManifest = {
  slug: 'qr',
  name: 'QR code',
  tagline: 'Show a scannable QR code',
  description:
    'Turn a link or text into a QR code your audience can scan from the screen.',
  runtimeKind: 'embed',
  dataSource: 'static',
  version: 4,
  icon: QR_ICON,
  color: '#111827',
  configSchema: [
    {
      key: 'qrType',
      type: 'select',
      label: 'QR type',
      default: 'url',
      options: [
        { label: 'Website URL', value: 'url' },
        { label: 'Phone number', value: 'phone' },
        { label: 'SMS', value: 'sms' },
        { label: 'Email', value: 'email' },
        { label: 'Wi-Fi', value: 'wifi' },
        { label: 'Google Reviews', value: 'review' },
      ],
    },

    // Website URL
    {
      key: 'value',
      type: 'url',
      label: 'Website URL',
      required: true,
      placeholder: 'https://example.com',
      visibleWhen: { field: 'qrType', equals: 'url' },
    },

    // Phone number
    {
      key: 'phone',
      type: 'text',
      label: 'Phone number',
      required: true,
      placeholder: '+381 60 123 4567',
      visibleWhen: { field: 'qrType', equals: 'phone' },
    },

    // SMS
    {
      key: 'smsPhone',
      type: 'text',
      label: 'Phone number',
      required: true,
      placeholder: '+381 60 123 4567',
      visibleWhen: { field: 'qrType', equals: 'sms' },
    },
    {
      key: 'smsMessage',
      type: 'text',
      label: 'Message',
      placeholder: 'Optional pre-filled message',
      visibleWhen: { field: 'qrType', equals: 'sms' },
    },

    // Email
    {
      key: 'emailTo',
      type: 'text',
      label: 'Email address',
      required: true,
      placeholder: 'name@example.com',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },
    {
      key: 'emailSubject',
      type: 'text',
      label: 'Subject',
      placeholder: 'Optional subject',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },
    {
      key: 'emailBody',
      type: 'textarea',
      label: 'Body',
      placeholder: 'Optional message',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },

    // Wi-Fi
    {
      key: 'wifiSsid',
      type: 'text',
      label: 'Network name (SSID)',
      required: true,
      placeholder: 'MyNetwork',
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },
    {
      key: 'wifiPassword',
      type: 'text',
      label: 'Password',
      placeholder: 'Leave blank for an open network',
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },
    {
      key: 'wifiSecurity',
      type: 'select',
      label: 'Security',
      default: 'WPA',
      options: [
        { label: 'WPA/WPA2', value: 'WPA' },
        { label: 'WEP', value: 'WEP' },
        { label: 'None', value: 'nopass' },
      ],
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },
    {
      key: 'wifiHidden',
      type: 'switch',
      label: 'Hidden network',
      default: false,
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },

    // Google Reviews
    {
      key: 'reviewPlaceId',
      type: 'text',
      label: 'Google Place ID',
      required: true,
      placeholder: 'ChIJ…',
      help: "Your business's Google Place ID (find it via Google's Place ID Finder). The QR opens the review form.",
      visibleWhen: { field: 'qrType', equals: 'review' },
    },

    // Common
    {
      key: 'caption',
      type: 'textarea',
      label: 'Caption',
      placeholder: 'Scan me',
    },

    // Typography for the caption (shared across apps). The caption has always
    // been light (300); keep that as the default so saved instances don't shift.
    ...styleFields({ fontWeight: '300' }),

    {
      key: 'color',
      type: 'color',
      label: 'Color',
      section: 'Theme Settings',
      default: '#000000',
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background',
      section: 'Theme Settings',
      default: '#FFFFFF',
    },
  ],
}
