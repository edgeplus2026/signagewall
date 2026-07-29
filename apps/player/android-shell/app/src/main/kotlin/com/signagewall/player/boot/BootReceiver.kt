package com.signagewall.player.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.signagewall.player.KioskActivity

/**
 * Autostart on power-up: relaunch the kiosk Activity on boot (plus common OEM
 * "quickboot" broadcasts). The Android analogue of the Tauri autostart plugin;
 * `singleTask` keeps it a single instance.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
            -> {
                context.startActivity(
                    Intent(context, KioskActivity::class.java)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                )
            }
        }
    }
}
