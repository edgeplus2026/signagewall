import type { CollectionConfig, TextFieldValidation } from 'payload'

import { publishedOrAuthenticated } from '../access/published-or-authenticated'
import { contentRevalidationHooks } from '../lib/content-revalidation'
import { normaliseRedirectPath } from '../lib/redirect-path'

function internalPathResult(value: null | string | undefined): string | true {
  if (value === null || value === undefined || value === '') return true
  return normaliseRedirectPath(value)
    ? true
    : 'Use an internal path without a domain, query or fragment, for example /apps/gcal.'
}

const validateInternalPath: TextFieldValidation = (value) => internalPathResult(value)

const validateDestination: TextFieldValidation = (value, { siblingData }) => {
  const pathResult = internalPathResult(value)
  if (pathResult !== true) return pathResult
  const rawFromPath =
    typeof siblingData === 'object' &&
    'fromPath' in siblingData &&
    typeof siblingData.fromPath === 'string'
      ? siblingData.fromPath
      : undefined
  const fromPath = rawFromPath ? normaliseRedirectPath(rawFromPath) : null
  const toPath = value ? normaliseRedirectPath(value) : null
  return toPath && toPath === fromPath ? 'Destination must differ from the old path.' : true
}

function normaliseStoredPath(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return normaliseRedirectPath(value) ?? value.trim()
}

/**
 * Durable redirect history for slug changes and content consolidation. Paths
 * include their locale prefix, so records themselves are not localised.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: {
    singular: 'Redirect',
    plural: 'Redirects',
  },
  admin: {
    useAsTitle: 'fromPath',
    defaultColumns: ['fromPath', 'toPath', 'statusCode', 'active', '_status'],
    group: 'SEO',
  },
  access: { read: publishedOrAuthenticated },
  versions: { drafts: true },
  hooks: contentRevalidationHooks('redirects'),
  fields: [
    {
      name: 'fromPath',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: validateInternalPath,
      hooks: { beforeValidate: [({ value }) => normaliseStoredPath(value)] },
      admin: {
        description: 'Old path including any locale prefix, without domain, query or fragment.',
      },
    },
    {
      name: 'toPath',
      type: 'text',
      required: true,
      validate: validateDestination,
      hooks: { beforeValidate: [({ value }) => normaliseStoredPath(value)] },
      admin: {
        description: 'Canonical destination path including any locale prefix.',
      },
    },
    {
      name: 'statusCode',
      type: 'select',
      required: true,
      defaultValue: '308',
      options: [
        { label: '308 — permanent, preserve method', value: '308' },
        { label: '307 — temporary, preserve method', value: '307' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'preserveQuery',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Pass the incoming query string to the destination.',
        position: 'sidebar',
      },
    },
    {
      name: 'note',
      type: 'textarea',
      admin: {
        description: 'Why this redirect exists, for example a slug change or merged thin page.',
      },
    },
  ],
}
