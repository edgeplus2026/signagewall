import type { AppManifest } from '@signagewall/apps-contract'

import { DEFAULT_ACCENT } from '../_shared/theme.js'
import { currencyOptions, DEFAULT_CURRENCY } from '../_shared/currency.js'
import { tabularSourceFields } from '../_shared/tabular-source.js'
import { DEFAULT_MENU_TEMPLATE, menuTemplateOptions } from './templates.js'

/** The form section holding the items and where they come from. */
const MENU_ITEMS_SECTION = 'Menu items'

const MENU_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h4"/></svg>'

/**
 * Menu board / price list — designs for cafés, canteens and retail.
 *
 * A `connected` app with OPTIONAL auth: the default `manual` source keeps the
 * items as repeater rows (with a one-time CSV import) and involves no
 * connection at all — the connector's `cacheKey` returns '' and the instance
 * behaves like a static app. Switching the source to Google Sheets or
 * Microsoft Excel syncs the rows live from a spreadsheet (column-mapped), with
 * provider push notifications on top of the poll cadence.
 *
 * **v3 — the design owns the look.** The board used to ship a light/dark theme
 * preset, three colour pickers and the five generic typography fields, which
 * meant every template had to survive every combination of them and none could
 * commit to a look of its own. Now each template carries its own palette and
 * type in CSS, and the only visual knob left is the accent, so a café can put
 * its brand colour on the headings and prices. Existing instances keep their
 * stored values in Mongo until their next save; the embed simply stops reading
 * them, so those boards adopt their template's palette on the next render.
 *
 * Prices are numbers formatted with the instance-wide currency, always written
 * after the amount. Legacy configs (v1) with free-form string prices and the
 * removed `columns` field still render — the embed is tolerant and the CMS
 * normalizes them on first edit.
 */
export const menuManifest: AppManifest = {
  slug: 'menu',
  name: 'Menu board',
  tagline: 'Show a menu or price list',
  description:
    'A designed board of items and prices: for cafés, canteens and shops. Keep the items here, import a CSV, or sync them live from Google Sheets or Excel.',
  runtimeKind: 'embed',
  dataSource: 'connected',
  version: 4,
  /**
   * One minute. The Sheets-synced menu is pushed live by Drive `files.watch`,
   * but Google throttles those notifications to about one per file per three
   * minutes, so the poll is what actually decides how fast a price change
   * reaches the board. One `values.get` per menu per minute buys that.
   */
  refreshSeconds: 60,
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
      previewGallery: 'menu',
      options: menuTemplateOptions(),
    },
    {
      key: 'currency',
      type: 'select',
      label: 'Currency',
      searchable: true,
      default: DEFAULT_CURRENCY,
      help: 'Written after every price on the board.',
      options: currencyOptions(),
    },
    {
      key: 'accentColor',
      type: 'color',
      label: 'Accent colour',
      help: 'The headings and the prices. Everything else comes from the design.',
      default: DEFAULT_ACCENT,
    },
    // The items block gets its own section: with a live sync it is seven fields,
    // and interleaving them with the design fields buried both. `sectionOpen` on
    // the first field keeps it expanded — it holds the app's actual content, so
    // an operator must not have to find a disclosure triangle to add an item.
    ...tabularSourceFields({
      section: MENU_ITEMS_SECTION,
      sectionOpen: true,
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
      section: MENU_ITEMS_SECTION,
      help: 'The items on the board. Price, description, category and photo are optional.',
      visibleWhen: { field: 'source', equals: 'manual' },
      csvImport: true,
      // Five columns do not fit the ~384px config sidebar; edit them in a modal.
      editor: 'dialog',
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
  ],
}
