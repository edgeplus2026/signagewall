export type OpsBoardStatus =
  | 'neutral'
  | 'planned'
  | 'active'
  | 'warning'
  | 'blocked'
  | 'done'

export interface OpsBoardRow {
  label: string
  primary?: string
  secondary?: string
  status: OpsBoardStatus
  note?: string
  group?: string
}

/** Token-free, normalized data sent to the player for a connected source. */
export interface OpsBoardPayload {
  sourceTitle?: string
  rows: OpsBoardRow[]
  updatedAt?: string
}
