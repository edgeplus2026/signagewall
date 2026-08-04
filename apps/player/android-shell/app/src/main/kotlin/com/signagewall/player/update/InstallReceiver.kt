package com.signagewall.player.update

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import com.signagewall.player.kiosk.KioskPresence
import java.io.File

/**
 * The authoritative outcome of an install.
 *
 * It used to handle STATUS_PENDING_USER_ACTION and drop everything else on the
 * floor — so a signing-certificate conflict, a full disk, an aborted confirmation
 * and a successful install were all indistinguishable, and none of them wrote
 * anything. `session.commit()` returns immediately, so the updater's own catch block
 * cannot see a post-commit rejection either: this receiver was the ONLY place the
 * truth was ever going to arrive, and it was throwing it away. A device could retry
 * the same doomed version every six hours forever while reporting itself healthy.
 *
 * It also used to claim, in a comment repeated in two other files, that "the OS
 * relaunches the app" after a successful install. It does not. That is what
 * `PackageReplacedReceiver` is for.
 */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val store = UpdaterStateStore(File(context.filesDir, "updates/state.json"))
        when (val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -1)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                // Off Device Owner Android insists a human confirms. Hold the
                // keep-alive off first: it would otherwise drag the player back over
                // the dialog within seconds and the update could never complete.
                KioskPresence.suppressReclaim(CONFIRM_GRACE_MILLIS)
                @Suppress("DEPRECATION")
                val confirm = intent.getParcelableExtra<Intent>(Intent.EXTRA_INTENT)
                confirm?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                try {
                    confirm?.let { context.startActivity(it) }
                } catch (t: Throwable) {
                    Log.w(TAG, "could not show the install confirmation", t)
                    record(store, "error", "confirmation could not be shown")
                }
            }

            PackageInstaller.STATUS_SUCCESS -> {
                // Terminal and good. PackageReplacedReceiver puts the player back.
                Log.i(TAG, "update installed")
                record(store, "installing", null)
            }

            else -> {
                val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                val versionCode = intent.getIntExtra(EXTRA_VERSION_CODE, 0)
                Log.w(TAG, "install failed: status=$status message=$message")
                record(store, "error", message ?: "install failed ($status)", versionCode)
            }
        }
    }

    /**
     * Records the outcome and, on failure, clears `pendingVersion` — otherwise the
     * post-update health gate arms on a version that was never actually installed and
     * spends its deferrals judging a build that is not there.
     */
    private fun record(
        store: UpdaterStateStore,
        result: String,
        error: String?,
        versionCode: Int = 0,
    ) {
        try {
            val state = store.read()
            store.write(
                when {
                    error == null -> state.copy(lastResult = result)
                    // Counting the failure HERE is the whole point of the counter.
                    // `commit()` returns immediately, so the updater's own catch block
                    // never sees a post-commit rejection — a signing conflict, a full
                    // disk, an aborted confirmation all arrive only as this broadcast.
                    // Without this the per-version backoff never advanced past zero
                    // and the same doomed APK was retried forever, which is exactly
                    // the loop the counter was added to break.
                    versionCode > 0 ->
                        state
                            .copy(lastResult = result, pendingVersion = null)
                            .withFailure(versionCode, System.currentTimeMillis())
                    else -> state.copy(lastResult = result, pendingVersion = null)
                },
            )
        } catch (t: Throwable) {
            Log.w(TAG, "could not record the install outcome", t)
        }
    }

    companion object {
        /** Which version this broadcast is about — PackageInstaller does not say,
         *  and without it a failure cannot be attributed to a version. */
        const val EXTRA_VERSION_CODE = "com.signagewall.player.EXTRA_VERSION_CODE"

        private const val TAG = "InstallReceiver"

        /** Long enough for someone to read a system dialog and press OK. */
        const val CONFIRM_GRACE_MILLIS = 3 * 60 * 1000L
    }
}
