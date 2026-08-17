import type { AppManifest } from '@signagewall/apps-contract'

import { styleFields } from '../_shared/style-fields.js'

const QR_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm8 0h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z"/></svg>'

/**
 * QR code — turns any URL/text into a scannable code (menus, promos,
 * contactless). Pure client-side: the code is generated in the browser.
 *
 * The `qrType` options are named after what the code DOES on the phone ("Call a
 * phone number"), not after the payload format ("Phone number"). Operators are
 * choosing an outcome, not a data type — the format is our problem, not theirs.
 * The values are untouched; only the labels speak the user's language.
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
      label: 'What the code does',
      help: 'What happens on the phone when someone scans it.',
      default: 'url',
      options: [
        { label: 'Open a website', value: 'url' },
        { label: 'Call a phone number', value: 'phone' },
        { label: 'Send a text message', value: 'sms' },
        { label: 'Write an email', value: 'email' },
        { label: 'Join a Wi-Fi network', value: 'wifi' },
        { label: 'Leave a Google review', value: 'review' },
      ],
    },

    // Website URL
    {
      key: 'value',
      type: 'url',
      label: 'Website address',
      required: true,
      placeholder: 'https://example.com',
      help: 'Where the code takes people when they scan it.',
      visibleWhen: { field: 'qrType', equals: 'url' },
    },

    // Phone number
    {
      key: 'phone',
      type: 'text',
      label: 'Phone number',
      required: true,
      placeholder: '+381 60 123 4567',
      help: 'Scanning opens the dialer with this number ready to call.',
      visibleWhen: { field: 'qrType', equals: 'phone' },
    },

    // SMS
    {
      key: 'smsPhone',
      type: 'text',
      label: 'Phone number',
      required: true,
      placeholder: '+381 60 123 4567',
      help: 'The number the text message is sent to.',
      visibleWhen: { field: 'qrType', equals: 'sms' },
    },
    {
      key: 'smsMessage',
      type: 'text',
      label: 'Message',
      placeholder: 'Optional',
      help: 'Written into the message for them. They can still edit it before sending.',
      visibleWhen: { field: 'qrType', equals: 'sms' },
    },

    // Email
    {
      key: 'emailTo',
      type: 'text',
      label: 'Email address',
      required: true,
      placeholder: 'name@example.com',
      help: 'The address the email is sent to.',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },
    {
      key: 'emailSubject',
      type: 'text',
      label: 'Subject',
      placeholder: 'Optional',
      help: 'Filled in for them. They can still change it before sending.',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },
    {
      key: 'emailBody',
      type: 'textarea',
      label: 'Message',
      placeholder: 'Optional',
      help: 'Filled in for them. They can still edit it before sending.',
      visibleWhen: { field: 'qrType', equals: 'email' },
    },

    // Wi-Fi
    {
      key: 'wifiSsid',
      type: 'text',
      label: 'Wi-Fi network name',
      required: true,
      placeholder: 'MyNetwork',
      help: "Exactly as it appears in the phone's Wi-Fi list. Sometimes called the SSID.",
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },
    {
      key: 'wifiPassword',
      type: 'text',
      label: 'Wi-Fi password',
      help: 'Leave blank if the network has no password.',
      visibleWhen: { field: 'qrType', equals: 'wifi' },
    },
    {
      key: 'wifiSecurity',
      type: 'select',
      label: 'Security type',
      help: "If you don't know, WPA/WPA2 is almost always the right one.",
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
      help: "Turn this on only if the network doesn't show up in the phone's Wi-Fi list.",
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
      // The label keeps Google's own name for it on purpose: the operator has to
      // recognise it on Google's page. The help does the explaining instead.
      help: "Search your business in Google's Place ID Finder and paste the code it gives you. Scanning opens your review form.",
      visibleWhen: { field: 'qrType', equals: 'review' },
    },

    // Common
    {
      key: 'caption',
      type: 'textarea',
      label: 'Caption',
      placeholder: 'Scan me',
      help: 'Optional text beside the code. Tell people why they should scan it.',
    },

    // Typography for the caption (shared across apps). The caption has always
    // been light (300); keep that as the default so saved instances don't shift.
    ...styleFields({ fontWeight: '300' }),

    {
      key: 'color',
      type: 'color',
      label: 'QR code color',
      section: 'Theme Settings',
      default: '#000000',
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background color',
      section: 'Theme Settings',
      default: '#FFFFFF',
    },
  ],
}
