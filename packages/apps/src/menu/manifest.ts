import type { AppManifest } from '@edge/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { currencyOptions, DEFAULT_CURRENCY } from '../_shared/currency.js'
import { styleFields } from '../_shared/style-fields.js'
import { tabularSourceFields } from '../_shared/tabular-source.js'
import { DEFAULT_MENU_TEMPLATE, menuTemplateOptions } from './templates.js'

const MENU_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>'

/**
 * Menu board / price list — five designs for cafés, canteens and retail.
 *
 * A `connected` app with OPTIONAL auth: the default `manual` source keeps the
 * items as repeater rows (with a one-time CSV import) and involves no
 * connection at all — the connector's `cacheKey` returns '' and the instance
 * behaves like a static app. Switching the source to Google Sheets or
 * Microsoft Excel syncs the rows live from a spreadsheet (column-mapped), with
 * provider push notifications on top of the poll cadence.
 *
 * Prices are numbers formatted with the instance-wide currency; legacy configs
 * (v1) with free-form string prices and the removed `columns` field still
 * render — the embed is tolerant and the CMS normalizes them on first edit.
 */
export const menuManifest: AppManifest = {
  slug: 'menu',
  name: 'Menu board',
  tagline: 'Show a menu or price list',
  description:
    'A designed board of items and prices — for cafés, canteens and shops. Keep the items here, import a CSV, or sync them live from Google Sheets or Excel.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 2,
  refreshSeconds: 900,
  icon: MENU_ICON,
  color: '#16A34A',
  configSchema: [
    {
      key: 'heading',
      type: 'text',
      label: 'Heading',
      help: 'Shown at the top. Leave blank for just the list.',
      placeholder: "Today's Menu",
    },
    {
      key: 'template',
      type: 'select',
      label: 'Design',
      default: DEFAULT_MENU_TEMPLATE,
      options: menuTemplateOptions(),
    },
    {
      key: 'currency',
      type: 'select',
      label: 'Currency',
      searchable: true,
      default: DEFAULT_CURRENCY,
      help: 'Applied to every price on the board.',
      options: currencyOptions(),
    },
    {
      key: 'currencyPosition',
      type: 'select',
      label: 'Currency position',
      default: 'prefix',
      options: [
        { label: 'Before the amount (€10)', value: 'prefix' },
        { label: 'After the amount (10 €)', value: 'suffix' },
      ],
    },
    // No `section`: the items source block belongs to the always-open primary
    // group — it IS the app's content. Emitted before the repeater so "Items
    // come from" leads, the (hidden-in-manual-mode) sync fields follow it, and
    // the manual table sits right under the choice it depends on.
    ...tabularSourceFields({
      itemsKey: 'items',
      targets: [
        { key: 'name', label: 'Name', required: true },
        { key: 'price', label: 'Price' },
        { key: 'description', label: 'Description' },
        { key: 'category', label: 'Category' },
        { key: 'imageUrl', label: 'Image URL' },
      ],
    }),
    {
      key: 'items',
      type: 'repeater',
      label: 'Items',
      help: 'The items on the board. Price, description, category and photo are optional.',
      visibleWhen: { field: 'source', equals: 'manual' },
      csvImport: true,
      required: true,
      validation: { min: 1 },
      fields: [
        { key: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Espresso' },
        { key: 'price', type: 'number', label: 'Price', placeholder: '2.50' },
        {
          key: 'description',
          type: 'text',
          label: 'Description',
          placeholder: 'Oat milk on request',
        },
        { key: 'category', type: 'text', label: 'Category', placeholder: 'Drinks' },
        // Keyed `imageUrl` (not `image`) so a synced row converted to manual
        // keeps its picture 1:1 — the sync mapping targets use the same key.
        { key: 'imageUrl', type: 'image', label: 'Photo' },
      ],
    },
    {
      key: 'theme',
      type: 'select',
      label: 'Theme',
      help: 'A starting point — it fills in the colours below, which you can still change.',
      default: 'dark',
      options: [
        {
          label: 'Light',
          value: 'light',
          set: {
            backgroundColor: '#FFFFFF',
            textColor: '#0F172A',
            accentColor: DEFAULT_ACCENT,
          },
        },
        {
          label: 'Dark',
          value: 'dark',
          set: {
            backgroundColor: '#0B1220',
            textColor: '#E2E8F0',
            accentColor: DEFAULT_ACCENT,
          },
        },
      ],
    },
    {
      key: 'backgroundColor',
      type: 'color',
      label: 'Background colour',
      section: 'Theme Settings',
      default: '#0B1220',
    },
    {
      key: 'textColor',
      type: 'color',
      label: 'Text colour',
      section: 'Theme Settings',
      default: '#E2E8F0',
    },
    {
      key: 'accentColor',
      type: 'color',
      label: 'Accent colour',
      section: 'Theme Settings',
      help: 'The heading and the prices.',
      default: DEFAULT_ACCENT,
    },
    ...styleFields(),
  ],
}
