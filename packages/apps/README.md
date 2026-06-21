# @edge/apps

One folder per signage app under `src/<slug>/`. Each app keeps its sides together:

```
src/
  index.ts            Registry: APP_MANIFESTS + shared helpers
  youtube/
    manifest.ts       slug, name, runtimeKind, dataSource, configSchema, version
    embed.ts          URL helpers (used by CMS preview now, player later)
    player.tsx        Preact render — added when the player exists
```

All build on `@edge/apps-contract`. The **backend syncs** `APP_MANIFESTS` into the
catalog (as drafts; super-admin publishes). The CMS resolves app-specific bits by
slug (e.g. the YouTube embed preview). This package is backend-safe — it exports
only manifests + pure helpers (no JSX), so Nest can import it directly.
