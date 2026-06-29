import type { FieldType } from '@edge/apps-contract'
import type { ReactNode } from 'react'

import { OAuthControl } from '@/features/apps/config-form/OAuthControl'
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
  // Connect a third-party account (Google/Microsoft) and store the chosen
  // connection id; used by `connected` apps (Calendar, OneDrive).
  oauth: OAuthControl,
}

/** Field types rendered with the label beside the control instead of above it. */
export const INLINE_FIELD_TYPES = new Set<FieldType>(['checkbox', 'switch'])
