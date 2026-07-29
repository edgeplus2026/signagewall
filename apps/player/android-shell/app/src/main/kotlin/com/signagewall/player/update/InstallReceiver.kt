package com.signagewall.player.update

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller

/**
 * Handles PackageInstaller session results. On a non-Device-Owner device the commit
 * yields STATUS_PENDING_USER_ACTION — we launch the system's install-confirm dialog.
 * On a Device-Owner device the install is silent (no user action) and the OS relaunches
 * the app, so nothing is needed here for the happy path.
 */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1) ==
            PackageInstaller.STATUS_PENDING_USER_ACTION
        ) {
            @Suppress("DEPRECATION")
            val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
            confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            confirm?.let { context.startActivity(it) }
        }
    }
}
