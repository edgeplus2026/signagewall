// @ts-nocheck
/**
 * Canonical full-copy registry for the 20 reviewed bilingual Blog posts.
 *
 * The batches keep editorial review manageable; seeds and migrations import
 * this one merged map so a base post can never silently fall back to the older
 * short-form body.
 */
import { POSTS_FULL_EDITORIAL } from './posts-full-editorial'
import { POSTS_FULL_FOUNDATIONS } from './posts-full-foundations'
import { POSTS_FULL_TECHNICAL } from './posts-full-technical'

export const POSTS_FULL = {
  ...POSTS_FULL_FOUNDATIONS,
  ...POSTS_FULL_EDITORIAL,
  ...POSTS_FULL_TECHNICAL,
}
