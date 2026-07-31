import type { Access } from 'payload'

/** Editors can preview drafts; anonymous REST/GraphQL consumers see only the
 * published version. Server-side Local API queries still apply explicit status
 * filters so their behaviour remains obvious at each call site. */
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
