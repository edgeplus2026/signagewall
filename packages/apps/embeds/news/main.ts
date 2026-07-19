// News reuses the RSS renderer wholesale — it is the same payload (RssPayload)
// and the same display options; only the source-picking differs, and that is a
// backend/config concern. Importing the RSS bundle runs its host handshake and
// mounts it on this app's #app, exactly as the RSS app does.
import '../rss/main.js'
