import type { CollectionBeforeValidateHook, Field } from 'payload'

interface PublishingFieldsOptions {
  localeReadyDefault?: boolean
}

const SEO_WORKFLOW_VERSION = 1

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

/**
 * Marks documents created under the SEO workflow and gives only those records
 * fail-closed defaults on later locale updates. Legacy records intentionally
 * keep missing gates as `undefined` until the reviewed backfill supplies an
 * explicit decision.
 */
export const initializeSeoWorkflow: CollectionBeforeValidateHook = ({
  data,
  operation,
  originalDoc,
}) => {
  const original = objectValue(originalDoc)
  const managed = operation === 'create' || original?.seoWorkflowVersion === SEO_WORKFLOW_VERSION
  if (!managed) return data

  const incoming = objectValue(data) ?? {}
  const seo = objectValue(incoming.seo) ?? {}
  return {
    ...incoming,
    seoWorkflowVersion: SEO_WORKFLOW_VERSION,
    localeReady: typeof incoming.localeReady === 'boolean' ? incoming.localeReady : false,
    seo: {
      ...seo,
      indexable: typeof seo.indexable === 'boolean' ? seo.indexable : false,
    },
  }
}

export function seoWorkflowVersionField(): Field {
  return {
    name: 'seoWorkflowVersion',
    type: 'number',
    admin: { hidden: true },
  }
}

/**
 * Payload draft status belongs to the whole document. These fields add the
 * per-language review state required by the public site.
 */
export function publishingFields({ localeReadyDefault }: PublishingFieldsOptions = {}): Field[] {
  return [
    {
      name: 'localeReady',
      type: 'checkbox',
      localized: true,
      ...(localeReadyDefault === undefined ? {} : { defaultValue: localeReadyDefault }),
      index: true,
      admin: {
        description:
          'This language version is complete, reviewed and safe to expose on its public URL.',
        position: 'sidebar',
      },
    },
    {
      name: 'lastReviewedAt',
      type: 'date',
      localized: true,
      admin: {
        description: 'When this language version was last checked for accuracy.',
        position: 'sidebar',
      },
    },
    {
      name: 'reviewedBy',
      type: 'relationship',
      relationTo: 'users',
      localized: true,
      admin: {
        description: 'Editor responsible for the latest review of this language version.',
        position: 'sidebar',
      },
    },
  ]
}
