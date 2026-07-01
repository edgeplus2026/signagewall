import type { FieldType } from '@edge/apps-contract'
import type { ReactNode } from 'react'

import { LocationControl } from '@/features/apps/config-form/LocationControl'
import { OAuthControl } from '@/features/apps/config-form/OAuthControl'
import { RemoteSelectControl } from '@/features/apps/config-form/RemoteSelectControl'
import { RichTextControl } from '@/features/apps/config-form/RichTextControl'
import {
  CheckboxControl,
  ColorControl,
  type FieldControlProps,
  ImageControl,
  MultiSelectControl,
  NumberControl,
  SelectControl,
  SwitchControl,
  TextareaControl,
  TextControl,
} from '@/features/apps/config-form/controls'

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
}

/** Field types rendered with the label beside the control instead of above it. */
export const INLINE_FIELD_TYPES = new Set<FieldType>(['checkbox', 'switch'])
