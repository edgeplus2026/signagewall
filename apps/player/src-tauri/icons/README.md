# Icons

The bundler needs the icon files referenced in `tauri.conf.json` (`32x32.png`,
`128x128.png`, `128x128@2x.png`, `icon.ico`). They are **binary** and are NOT
committed here yet — generate them once from a single square source PNG
(≥1024×1024):

```bash
pnpm --filter @edge/player tauri icon path/to/logo-1024.png
```

That writes all required sizes (incl. `icon.ico` for Windows) into this folder.
Run it before the first `tauri build`.
