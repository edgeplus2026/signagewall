import type { FieldType } from '@signagewall/apps-contract'
import type { ReactNode } from 'react'

import { LocationControl } from '@/features/apps/config-form/LocationControl'
import { OAuthControl } from '@/features/apps/config-form/OAuthControl'
import { RemoteSelectControl } from '@/features/apps/config-form/RemoteSelectControl'
import { RepeaterControl } from '@/features/apps/config-form/RepeaterControl'
import { RichTextControl } from '@/features/apps/config-form/RichTextControl'
import { ScreensControl } from '@/features/apps/config-form/ScreensControl'
import {
  CheckboxControl,
  ColorControl,
  DateTimeControl,
  type FieldControlProps,
  FileControl,
  ImageControl,
  MultiSelectControl,
  NumberControl,
  SelectControl,
  SwitchControl,
  TextareaControl,
  TextControl,
} from '@/features/apps/config-form/controls'
import { ColumnMappingControl } from '@/features/apps/config-form/tabular/ColumnMappingControl'
import { TabularPreviewControl } from '@/features/apps/config-form/tabular/TabularPreviewControl'

/** Maps each field type to the control that renders it. */
export const FIELD_CONTROLS: Record<FieldType, (props: FieldControlProps) => ReactNode> = {
  text: TextControl,
  textarea: TextareaControl,
  url: TextControl,
  number: NumberControl,
  select: SelectControl,
  multiselect: MultiSelectControl,
  checkbox: CheckboxControl,
  switch: SwitchControl,
  color: ColorControl,
  image: ImageControl,
  // Dropzone that reads a file (e.g. a PDF) to a base64 data URL string.
  file: FileControl,
  // Native date-and-time picker; stores a local `YYYY-MM-DDTHH:MM` string.
  datetime: DateTimeControl,
  // Add/remove/reorder rows, each a small set of typed sub-fields (`field.fields`).
  repeater: RepeaterControl,
  // Connect a third-party account (Google/Canva) and store the chosen
  // connection id; used by `connected` apps (Calendar, Canva).
  oauth: OAuthControl,
  // Searchable city dropdown; stores { label, lat, lng } for the weather app.
  location: LocationControl,
  // WYSIWYG rich text; stores semantic HTML (sanitized at render).
  richtext: RichTextControl,
  // Async searchable dropdown over a connected account; stores { id, label }.
  // Used by `connected` apps that pick a remote resource (Canva designs).
  'remote-select': RemoteSelectControl,
  // The org's screens as a multi-select; used by overlay apps (ticker) to pick
  // where the overlay shows. Stores the selected screen ids.
  screens: ScreensControl,
  // Map synced-spreadsheet columns onto item fields; stores {target: header}.
  'column-mapping': ColumnMappingControl,
  // Read-only table of the rows a tabular sync produces + "convert to manual".
  'tabular-preview': TabularPreviewControl,
}

/** Field types rendered with the label beside the control instead of above it. */
export const INLINE_FIELD_TYPES = new Set<FieldType>(['checkbox', 'switch'])
