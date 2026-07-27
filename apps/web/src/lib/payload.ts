import config from '@payload-config'
import { getPayload } from 'payload'

/** Cached Payload local-API client for server-side data access (blog). */
export function getPayloadClient() {
  return getPayload({ config })
}
