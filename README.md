# SignageWall

Monorepo for the SignageWall digital-signage platform.

## Layout

```
apps/
  be/        NestJS API (MongoDB + Cloudflare R2)
  cms/       React dashboard
  player/    Preact PWA player (coming soon)
  web/       Next.js marketing site + Payload editorial CMS

packages/
  apps-contract/   Shared contract: manifest + field-schema types + zod helpers
  apps/            One folder per signage app (manifest + schema + connector + player)
```

## Tooling

- **pnpm** workspaces + **turbo** task runner.
- Node >= 20.
- **poppler-utils** (`pdftoppm`) on the backend host/image — the PowerPoint app
  rasterizes decks to slide images with it. Install with `brew install poppler`
  (macOS) or `apt-get install -y poppler-utils` (Debian/Ubuntu). Absent, only the
  PowerPoint app is affected (it errors clearly); everything else runs.

## Common commands

```bash
pnpm install          # install all workspaces
pnpm build            # turbo: build everything
pnpm type-check       # turbo: type-check everything
pnpm lint             # turbo: lint everything
pnpm --filter @signagewall/cms dev   # run a cms
pnpm --filter @signagewall/player dev #run a player
pnpm --filter @signagewall/be start:dev #run a be
pnpm --filter @signagewall/web dev    # marketing site + Payload admin on :3002
```

## Marketing content

The public Blog, Solutions and Apps routes live in `apps/web`. Blog and
Solutions are edited in the embedded Payload admin at `/admin`; the product app
registry in `packages/apps` remains the technical source of truth for player
capabilities. An app manifest does not by itself make an SEO page publishable:
the matching editorial App Page record controls localized copy, search intent
and indexability.

```bash
# Create missing non-indexable App Page drafts from the technical registry.
pnpm --filter @signagewall/web seed:app-pages

# Create or update the 20 reviewed bilingual Blog posts and six Solutions.
pnpm --filter @signagewall/web seed:posts
pnpm --filter @signagewall/web seed:solutions

# Resolve the deliberately selected Blog/Solution/App relationships. Run this
# only after all three seed commands above, because broken targets fail loudly.
pnpm --filter @signagewall/web seed:content-links

# Check repository-owned content, intent briefs and internal-link targets.
pnpm --filter @signagewall/web content:audit

# Preview retirement of the 14 superseded Solution records. This does not
# delete records; apply only after reviewing the output and taking a backup.
pnpm --filter @signagewall/web content:retire-solutions
pnpm --filter @signagewall/web content:retire-solutions:apply

# Preview an SEO-gate backfill for older seeded records without writing.
pnpm --filter @signagewall/web seo:backfill

# Apply only after reviewing the dry-run output and taking a database backup.
pnpm --filter @signagewall/web seo:backfill:apply
```

The Blog seed requires the configured Payload database and Pexels credentials
because it uploads repository-specified cover and inline photography. The
content audit is intentionally offline and is the first check to run in CI.
If object storage is temporarily unavailable, `seed:posts:text-only` publishes
the reviewed copy without media. It is an explicit recovery mode: rerun
`seed:posts` after storage is fixed to attach the covers and inline images to
the same records.

For each locale, publish only after its intent brief is distinct, the visible
content is complete, `localeReady` is enabled and `seo.indexable` is enabled.
Only then does that locale enter hreflang and `sitemap.xml`. Preview and staging
deployments need no flag to stay out of search: `robots.txt` and the
`X-Robots-Tag` header both follow `INDEXING_ENABLED`, which is true only for a
production build served from `CANONICAL_ORIGIN` in `apps/web/src/lib/site-url.ts`.
Taking the live site out of search is therefore a code change, not a stray
environment variable. Branded news apps are RSS presets rather than separate
search intents, so they remain available in the product catalogue but are always
excluded from indexing.

New content is fail-closed by default. Existing Blog/Solution records have a
temporary compatibility path so a deploy cannot deindex the whole established
site before editors finish the migration. After those records have explicit
intent, readiness and indexability values, resolve the remaining audit
warnings, review the affected locale versions in Payload, and only then set
`SEO_STRICT_CONTENT_GATES=true`.


