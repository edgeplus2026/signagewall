package com.signagewall.player.update

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.util.Log
import com.signagewall.player.kiosk.KioskPresence
import java.io.File
import com.signagewall.player.runtime.ShellLog

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
                // Whether a person asked for THIS install. Absent means the
                // scheduler did, and the scheduler has nobody to answer a dialog.
                val operatorPresent = intent.getBooleanExtra(EXTRA_OPERATOR_PRESENT, false)
                if (!operatorPresent) {
                    // Android decided it wants a human. We do not argue, but we also
                    // do not throw a confirmation over a shop wall at four in the
                    // morning where it would sit unanswered on top of the content
                    // until somebody visits. Record it, drop the session, and let the
                    // screen report `needs-operator` so the CMS can ask for a visit
                    // deliberately instead of the screen demanding one.
                    Log.i(TAG, "install needs a person; not prompting an unattended screen")
                    ShellLog.of(context)?.record(
                        "update",
                        "update needs a person to confirm; left for an operator",
                    )
                    // The second argument is deliberately non-null with no version
                    // code: that is the branch which clears `pendingVersion` without
                    // counting a failure. Leaving the pending version set would have
                    // `reconcile` overwrite this with `error` on the next boot — the
                    // build is not bad, it is just waiting for a person — and
                    // counting a failure would push a perfectly good version towards
                    // being abandoned.
                    // Counted against the version so the per-version backoff
                    // throttles the retry. Without a count the scheduler would
                    // re-download and re-abandon the same APK every hour forever on
                    // a screen that plainly needs a visit. The operator path bypasses
                    // that backoff (`isInstallable(operatorPresent = true)`), so a
                    // technician who does turn up is never told there is nothing to
                    // install. This also clears `pendingVersion`, which otherwise had
                    // `reconcile` overwrite this with `error` on the next boot.
                    record(
                        store,
                        "needs-operator",
                        "waiting for an operator",
                        intent.getIntExtra(EXTRA_VERSION_CODE, 0),
                    )
                    val sessionId =
                        intent.getIntExtra(PackageInstaller.EXTRA_SESSION_ID, -1)
                    if (sessionId >= 0) {
                        runCatching {
                            context.packageManager.packageInstaller
                                .abandonSession(sessionId)
                        }
                    }
                    return
                }
                // Off Device Owner Android insists a human confirms. Hold the
                // keep-alive off first: it would otherwise drag the player back over
                // the dialog within seconds and the update could never complete.
                // The moment the box says it needs a person. Nothing else writes
                // this: if nobody ever answers the dialog, no further status
                // arrives and the whole episode would leave no trace — which is
                // exactly what happened on the first box we watched.
                ShellLog.of(context)?.record(
                    "update",
                    "waiting for someone to confirm the install",
                )
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
                ShellLog.of(context)?.record("update", "installed successfully")
                record(store, "installing", null)
            }

            else -> {
                val message = intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                val versionCode = intent.getIntExtra(EXTRA_VERSION_CODE, 0)
                Log.w(TAG, "install failed: status=$status message=$message")
                ShellLog.of(context)?.record(
                    "update",
                    "install FAILED status=$status $message",
                )
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

        /**
         * Whether a person asked for this install and can answer a dialog. The
         * PendingIntent carries it because by the time Android says it wants a
         * confirmation, the call that started the install is long gone.
         */
        const val EXTRA_OPERATOR_PRESENT = "com.signagewall.player.EXTRA_OPERATOR_PRESENT"

        private const val TAG = "InstallReceiver"

        /** Long enough for someone to read a system dialog and press OK. */
        const val CONFIRM_GRACE_MILLIS = 3 * 60 * 1000L
    }
}
