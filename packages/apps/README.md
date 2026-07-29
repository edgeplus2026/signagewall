# @signagewall/apps

The signage app catalog. One folder per app under `src/<slug>/`, and its player
runtime as a sandboxed iframe bundle under `embeds/<slug>/`:

```
src/
  index.ts              Registry: APP_MANIFESTS + shared helpers/types
  <slug>/
    manifest.ts         slug, name, runtimeKind: 'embed', dataSource, configSchema, version
    payload.ts          (data apps) the normalized shape the connector returns
embeds/
  <slug>/
    index.html          <div id="app"> + <script type="module" src="./main.ts">
    main.ts             connectToHost(({config, data, meta}) => render(...))
    style.css           (+ optional templates/ for multiple layouts)
  _shared/              host-bridge, base.css, style-fields, theme, freshness, …
```

All build on `@signagewall/apps-contract`. **Three kinds of app** (`dataSource`):
`static` (config only), `server` (a backend connector fetches public data), and
`connected` (a backend connector + OAuth). The backend connectors live in
`apps/be/src/modules/apps/connectors/`, not here — network I/O and secrets never
reach this shared package or the player.

The **backend syncs** `APP_MANIFESTS` into the catalog (technical fields only; a
super-admin publishes and owns presentation/visibility). The **CMS renders the
config form** from a manifest's `configSchema` and mounts the embed bundle for a
pixel-identical live preview; the **player** mounts the same bundle. Neither has
any per-app code — adding an app is a manifest + a bundle (+ a connector for data
apps). This package is backend-safe (no JSX), so Nest imports it directly.

`vite.embeds.config.ts` auto-discovers every `embeds/<slug>/index.html` and
builds the bundles into the player's (and, mirrored, the CMS's) `public/apps`.

**See [`BACKLOG.md`](./BACKLOG.md)** for the full "how to add an app" recipe, the
current catalog (~27 apps), and the roadmap.
