package com.signagewall.player

import android.app.Application
import com.signagewall.player.update.HealthWatchdog
import com.signagewall.player.update.UpdaterStateStore
import java.io.File

/**
 * Process entry point. On OTA builds it creates the process-wide [HealthWatchdog] and
 * arms it BEFORE the WebView loads, so a freshly-installed version that never even
 * loads the page is still caught. The [OtaUpdater] fetches this same instance (via
 * [postUpdateHealth]) so `report_alive`/`report_healthy` reach the one owner of the
 * alive/healthy flags. On dev / non-OTA builds this is a no-op.
 */
class PlayerApp : Application() {

    var postUpdateHealth: HealthWatchdog? = null
        private set

    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.UPDATE_MANIFEST_URL.isNotBlank()) {
            val health = HealthWatchdog(
                stateStore = UpdaterStateStore(File(filesDir, "updates/state.json")),
                currentVersionName = BuildConfig.VERSION_NAME,
                currentVersionCode = BuildConfig.VERSION_CODE,
                onRollback = {
                    // The state already flags `unhealthy` for the CMS. A silent DO
                    // downgrade-reinstall of the last-good APK is verify-pending.
                },
            )
            health.armIfPostUpdate()
            postUpdateHealth = health
        }
    }
}
