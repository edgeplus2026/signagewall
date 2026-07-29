import type { CollectionConfig } from 'payload'

import { SOLUTION_ICON_KEYS } from '../lib/solution-icons'

/**
 * One industry page each. Content lives here rather than in code so the copy can
 * be edited without a deploy; the *icon* stays a code-side key because a React
 * component can't be stored in Mongo.
 *
 * `faq` is not decoration — it renders as FAQPage structured data, which is the
 * cheapest rich result an industry page can earn.
 */
export const Solutions: CollectionConfig = {
  slug: 'solutions',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'order', '_status'],
    group: 'Content',
  },
  access: { read: () => true },
  versions: { drafts: true },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, localized: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      localized: true,
      admin: {
        description:
          'URL segment, per language — /solutions/<slug> and /en/solutions/<slug>. Changing it breaks existing links.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      admin: { description: 'Ascending. Ties fall back to name.' },
    },
    {
      name: 'icon',
      type: 'select',
      required: true,
      options: SOLUTION_ICON_KEYS.map((key) => ({ label: key, value: key })),
      admin: { description: 'Resolved to a Lucide icon in src/lib/solution-icons.ts.' },
    },
    {
      name: 'tagline',
      type: 'textarea',
      required: true,
      localized: true,
      admin: { description: 'Two sentences. Shown on the overview card — make it earn the click.' },
    },
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'subtitle', type: 'textarea', localized: true },
    {
      name: 'metaTitle',
      type: 'text',
      localized: true,
      admin: { description: 'Falls back to the page title. Aim for under ~60 characters.' },
    },
    {
      name: 'metaDescription',
      type: 'textarea',
      localized: true,
      admin: { description: 'Falls back to the subtitle. Aim for 140–160 characters.' },
    },
    {
      name: 'intro',
      type: 'textarea',
      localized: true,
      admin: {
        description:
          'Two or three paragraphs (blank line between them) on why a screen belongs in this industry — the context before the scenarios. This is most of what makes the page rank; without it the page is a list.',
      },
    },
    {
      name: 'scenarios',
      type: 'array',
      localized: true,
      minRows: 1,
      labels: { singular: 'Scenario', plural: 'Scenarios' },
      admin: { description: 'Aim for five or six. Three reads as a stub.' },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'body', type: 'textarea', required: true },
      ],
    },
    {
      name: 'proof',
      type: 'group',
      localized: true,
      label: 'Worked example',
      admin: {
        description:
          'One concrete calculation for this industry — what the old way costs per year against the subscription. Specific numbers are what a reader repeats to a colleague.',
      },
      fields: [
        { name: 'title', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    {
      name: 'recommendedApps',
      type: 'text',
      admin: {
        description:
          'Comma-separated app slugs from the @signagewall/apps catalog, e.g. "menu,weather,currency". Renders as links to /apps/<slug> — the internal linking the industry pages currently have none of. Not localised: slugs are the same in both languages.',
      },
    },
    {
      name: 'benefits',
      type: 'array',
      localized: true,
      minRows: 1,
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'faq',
      type: 'array',
      localized: true,
      labels: { singular: 'Question', plural: 'FAQ' },
      admin: {
        description:
          'Eight to ten. Write them as they get asked on a sales call, and answer at a length worth reading — a one-line answer is the shape nothing ever cites. Avoid reusing an answer across industries: twenty pages carrying the same sentence is what thin content looks like to a crawler.',
      },
      fields: [
        { name: 'q', type: 'text', required: true },
        { name: 'a', type: 'textarea', required: true },
      ],
    },
  ],
}
