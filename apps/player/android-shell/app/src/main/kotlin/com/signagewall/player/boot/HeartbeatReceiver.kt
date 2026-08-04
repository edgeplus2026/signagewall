package com.signagewall.player.boot

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * The supervisor's own pulse. `START_STICKY` is a request, not a promise: OEM
 * task-killers and some low-memory paths drop a service without reviving it, and a
 * supervisor cannot supervise its own absence. An inexact repeating alarm wakes this
 * receiver every ~15 minutes and it simply (re)starts the service — a no-op when the
 * service is already up, and the only thing that resurrects it when it is not.
 *
 * Cheap on purpose: no state, no work, no wakelock. The cost of a needless
 * startForegroundService on an already-running service is a few microseconds; the
 * cost of not having it is a screen that is dark until someone visits.
 */
class HeartbeatReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        WatchdogService.start(context)
    }
}
