package com.signagewall.player.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.signagewall.player.runtime.RuntimeState
import com.signagewall.player.runtime.RuntimeStateStore
import java.io.File

/**
 * Autostart on power-up.
 *
 * It used to call `startActivity` directly, which is exactly the call Android
 * refuses from a background receiver: measured on an Android 14 TV, the broadcast
 * arrived, the activity start was `BAL_BLOCK`ed, the process died seconds later, and
 * the screen stayed on the TV's own menu. Starting the supervisor instead is both
 * permitted and better — the supervisor has a ladder of ways to get the player up,
 * where this receiver had exactly one, and the weakest of them.
 *
 * Boot also RESETS intent-to-run. "Close application" from the service bar keeps an
 * unlocked screen closed for the rest of the day, which is what an operator standing
 * at the device means by it; it must not mean the display stays dark after a power
 * cut three weeks later, which is indistinguishable from a fault.
 *
 * There is deliberately no LOCKED_BOOT_COMPLETED here. Receiving it requires
 * `directBootAware`, and a direct-boot receiver may only touch device-protected
 * storage — while everything this one needs (runtime.json, the player's identity)
 * lives in credential-protected storage and is not readable until the user unlocks.
 * Registering the action without the flag, as an earlier version did, produced a
 * filter entry that could never fire and a comment implying autostart happened
 * earlier than it does.
 *
 * NOTE for whoever commissions these devices: an app a human has never launched
 * receives no BOOT_COMPLETED at all — Android holds it in the "stopped" state.
 * Opening the player once after install is a mandatory commissioning step and no
 * code here can substitute for it.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON",
            -> {
                try {
                    RuntimeStateStore(File(context.filesDir, "runtime.json")).update {
                        it.copy(
                            desiredState = RuntimeState.RUNNING,
                            launchRung = 0,
                            pageRestartUsed = false,
                        )
                    }
                } catch (t: Throwable) {
                    Log.w(TAG, "could not reset runtime state on boot", t)
                }
                WatchdogService.start(context)
            }
        }
    }

    private companion object {
        const val TAG = "BootReceiver"
    }
}
