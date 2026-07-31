import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { buildConfig, type Plugin } from 'payload'
import sharp from 'sharp'

import { AppPages } from './collections/AppPages'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Redirects } from './collections/Redirects'
import { Solutions } from './collections/Solutions'
import { Users } from './collections/Users'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Cloudflare R2 for uploads, when it is configured.
 *
 * `@payloadcms/storage-s3` was already a dependency but was never wired in, so
 * every upload landed on the app server's local disk and was served through
 * `/api/media/file/*` — no CDN, and nothing survives a redeploy on an ephemeral
 * filesystem. Gated on the credentials being present so a local checkout with
 * no R2 keys keeps working exactly as before.
 */
function r2StoragePlugin(): Plugin | null {
  const bucket = process.env.R2_BUCKET
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  // The early return is what narrows all four to `string` below, without an
  // assertion the linter would reject either way it is written.
  if (!bucket || !accountId || !accessKeyId || !secretAccessKey) return null
  const resolvedSecretAccessKey =
    secretAccessKey.startsWith('cfat_') || secretAccessKey.startsWith('cfut_')
      ? createHash('sha256').update(secretAccessKey).digest('hex')
      : secretAccessKey

  return s3Storage({
    collections: {
      // Matches the key prefix @signagewall/be already uses on the same bucket.
      media: { prefix: 'web' },
    },
    bucket,
    config: {
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      // R2 ignores the region but the S3 client insists on one.
      region: 'auto',
      credentials: { accessKeyId, secretAccessKey: resolvedSecretAccessKey },
      forcePathStyle: true,
      // R2 does not support the AWS SDK's newer default CRC32 behavior.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    },
  })
}

const storagePlugins: Plugin[] = [r2StoragePlugin()].filter((p) => p !== null)

export default buildConfig({
  plugins: storagePlugins,
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Posts, Solutions, AppPages, Redirects, Categories, Media, Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: mongooseAdapter({ url: process.env.DATABASE_URI ?? '' }),
  sharp,
  localization: {
    locales: [
      { label: 'Srpski', code: 'sr' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'sr',
    fallback: true,
  },
})
