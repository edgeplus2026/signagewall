package com.signagewall.player.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Brings the player back after it updates itself.
 *
 * This receiver did not exist, and its absence made the OTA channel a way to take
 * screens off the air. Three KDocs in the update package asserted "on success the OS
 * relaunches the app"; it does not. A package replace kills the process, does not
 * restart the Activity, does not re-deliver BOOT_COMPLETED, and does not revive a
 * sticky service of the replaced package. `MY_PACKAGE_REPLACED` is the one broadcast
 * Android sends for this, and nothing was listening — so every successful unattended
 * update ended with the TV showing its own menu until a human power-cycled it. A
 * fleet-wide update would have darkened the fleet.
 *
 * Like [BootReceiver] it starts the supervisor rather than the Activity: the
 * activity start from a background receiver is the call that is refused.
 */
class PackageReplacedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            WatchdogService.start(context)
        }
    }
}
