# Edge

Monorepo for the Edge digital-signage platform.

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

## Common commands

```bash
pnpm install          # install all workspaces
pnpm build            # turbo: build everything
pnpm type-check       # turbo: type-check everything
pnpm lint             # turbo: lint everything
pnpm --filter @edge/cms dev   # run a cms
pnpm --filter @edge/player dev #run a player
pnpm --filter @edge/be start:dev #run a be
```
