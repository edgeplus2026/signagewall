// Branded news app — the same runtime as the RSS app. The feed URL is a hidden,
// predefined field on this app's manifest (see src/rss/news.ts), so the shared
// RSS embed renders it with no per-app code.
import '../rss/main.js'
