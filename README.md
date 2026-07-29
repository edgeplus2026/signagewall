# SignageWall

Monorepo for the SignageWall digital-signage platform.

## Layout

```
apps/
  be/        NestJS API (MongoDB + Cloudflare R2)
  cms/       React dashboard
  player/    Preact PWA player (coming soon)

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
```
