/**
 * The normalized shape of one menu item, shared by the embed (renders it), the
 * backend connector (produces it from a synced spreadsheet) and the CMS
 * (previews synced rows / edits manual rows).
 *
 * `price` is a number formatted with the instance's currency at render time;
 * legacy manual rows may still carry a free-form string price, which templates
 * render verbatim.
 */
export interface MenuItem {
  name: string
  price?: number | string
  description?: string
  category?: string
  imageUrl?: string
}

/** The connector's player payload when items sync from Sheets/Excel. */
export interface MenuSyncPayload {
  items: MenuItem[]
  /** The spreadsheet's title, for CMS status display. */
  sourceTitle?: string
}
