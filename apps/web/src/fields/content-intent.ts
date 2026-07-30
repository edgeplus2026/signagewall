import type { Field } from 'payload'

/**
 * Editorial brief for keeping two pages from targeting the same query with
 * keyword-swapped copy. The group is localised because a translation can serve
 * a different query and audience from the source language.
 */
export function intentField(): Field {
  return {
    name: 'intent',
    type: 'group',
    localized: true,
    admin: {
      description:
        'Define the search need before writing. Indexable pages should have a distinct query, job-to-be-done and promise.',
    },
    fields: [
      {
        name: 'primaryQuery',
        type: 'text',
        admin: {
          description:
            'The main query this page should answer. Use one natural-language query, not a list of keywords.',
        },
      },
      {
        name: 'intentType',
        type: 'select',
        options: [
          { label: 'Informational', value: 'informational' },
          { label: 'Commercial investigation', value: 'commercial-investigation' },
          { label: 'Transactional', value: 'transactional' },
          { label: 'Navigational', value: 'navigational' },
        ],
      },
      {
        name: 'audience',
        type: 'text',
        admin: { description: 'Who is searching, including their role or level of experience.' },
      },
      {
        name: 'jobToBeDone',
        type: 'textarea',
        admin: { description: 'What the visitor needs to decide, understand or complete.' },
      },
      {
        name: 'uniquePromise',
        type: 'textarea',
        admin: {
          description:
            'The value this page provides that no sibling Blog, Solution or App page provides.',
        },
      },
      {
        name: 'notTargeting',
        type: 'textarea',
        admin: {
          description:
            'Nearby queries this page deliberately does not target. Use this to prevent cannibalisation.',
        },
      },
    ],
  }
}
