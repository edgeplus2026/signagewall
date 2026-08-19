package com.signagewall.player.update

import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import java.io.File

/**
 * Installs an APK via PackageInstaller.
 *
 * Three tiers, best-effort in this order, because an unattended screen nobody
 * stands in front of cannot answer a dialog:
 *
 *  1. Device Owner — commits silently, always.
 *  2. Android 12+ self-update — `USER_ACTION_NOT_REQUIRED` asks the system to skip
 *     the prompt. It needs UPDATE_PACKAGES_WITHOUT_USER_ACTION (a normal
 *     permission, auto-granted — verified on-device) AND that we are the app's own
 *     installer of record. A box sideloaded with a plain `adb install` has
 *     `installer=null` and can never update itself silently — but that IS fixable
 *     from outside, and provisioning is where to fix it: `adb install -i
 *     com.signagewall.player` sets the installer of record. Measured on Android 14;
 *     `pm set-installer` throws and does not work. Flash every device that way and
 *     no screen ever prompts. Skip it and the FIRST update needs a person standing
 *     there; performing that one is what makes us the installer for every update
 *     after.
 *  3. Otherwise the system shows the prompt, routed through [InstallReceiver] via
 *     `REQUEST_INSTALL_PACKAGES`.
 *
 * `setRequireUserAction` is a REQUEST, not a guarantee — the system may still
 * decide to ask (a changed signing cert, a permission-set change). That is why
 * [InstallReceiver] stays: it is the fallback, not dead code.
 *
 * On success the process is killed and `PackageReplacedReceiver` brings the player
 * back — Android does NOT relaunch it, whatever the previous comment here claimed.
 * The APK-signature check (PackageInstaller refuses a different signing cert) is the
 * Android trust anchor, backed by the caller's sha256 check.
 */
class InstallerStrategy(private val context: Context) {

    private companion object {
        const val TAG = "InstallerStrategy"
    }


    /**
     * Whether an install would go through without a human pressing anything.
     *
     * Two ways to earn that: being Device Owner, or being the app's own installer of
     * record while holding UPDATE_PACKAGES_WITHOUT_USER_ACTION. A box sideloaded with
     * a plain `adb install` has no installer of record, so this returns false and the
     * first update needs a person — but `adb install -i com.signagewall.player` at
     * provisioning time grants it up front, and a device provisioned that way took its
     * next release start-to-finish with no dialog (measured on Android 14; note
     * `pm set-installer` throws and cannot do this). See the class doc.
     *
     * The updater asks this before a SCHEDULED update, because throwing a system
     * dialog onto an unattended shop wall at four in the morning, where it will sit
     * unanswered over the content until someone visits, is worse than being a version
     * behind.
     */
    fun canInstallSilently(): Boolean {
        if (isDeviceOwner()) return true
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false
        // Holding the permission is the condition Android actually documents for a
        // self-update; being our own installer of record makes it far more likely to
        // be granted, but it is NOT required. Measured on Android 14: a device with
        // `installerPackageName=null` installed its own update with no dialog at all,
        // while this method — which used to demand the installer of record — had
        // already reported it as a screen needing a technician. Every such screen was
        // an unnecessary site visit.
        //
        // Being optimistic here is only safe because being wrong is now harmless:
        // [InstallReceiver] refuses to show a confirmation for an install nobody
        // asked for, records `needs-operator` and abandons the session, so the worst
        // case is the honest answer arriving one attempt later instead of being
        // guessed up front.
        return hasUpdateWithoutUserActionPermission()
    }

    private fun hasUpdateWithoutUserActionPermission(): Boolean =
        try {
            context.packageManager.checkPermission(
                "android.permission.UPDATE_PACKAGES_WITHOUT_USER_ACTION",
                context.packageName,
            ) == PackageManager.PERMISSION_GRANTED
        } catch (t: Throwable) {
            Log.w(TAG, "could not read the update permission", t)
            false
        }

    fun isDeviceOwner(): Boolean {
        val dpm =
            context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }

    /**
     * Whether [apk] is signed by the same certificate as the running app.
     *
     * PackageInstaller enforces this itself and would reject a mismatch — but only
     * AFTER the whole file has been streamed into a session, and only with a status
     * code that the old code discarded. Checking first turns "mysteriously fails
     * every six hours" into a clear, recordable refusal, and it means a
     * compromised-but-well-formed manifest cannot even get as far as a session. The
     * sha256 from the manifest proves the bytes are the ones the publisher listed;
     * this proves the publisher is us.
     */
    fun isSignedByUs(apk: File): Boolean {
        // GET_SIGNING_CERTIFICATES is API 28; minSdk here is 26. On Android 8.x the
        // query returns nothing, which read as "not signed by us" and made `install`
        // throw — freezing every 8.x box in the fleet at whatever version it had,
        // permanently, with no way to ship the fix. PackageInstaller enforces the
        // certificate itself regardless; this check is defence in depth and a clearer
        // error message, so skipping it where it cannot work costs nothing real.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) {
            return true
        }
        return try {
            val pm = context.packageManager
            val flags = PackageManager.GET_SIGNING_CERTIFICATES
            val candidate = pm.getPackageArchiveInfo(apk.absolutePath, flags)
                ?.signingInfo ?: return false
            val ours = pm.getPackageInfo(context.packageName, flags)
                .signingInfo ?: return false
            val theirDigests = candidate.apkContentsSigners.map { it.toCharsString() }.toSet()
            val ourDigests = ours.apkContentsSigners.map { it.toCharsString() }.toSet()
            theirDigests.isNotEmpty() && theirDigests == ourDigests
        } catch (t: Throwable) {
            Log.w(TAG, "could not read the APK signature", t)
            false
        }
    }

    fun install(apk: File, versionCode: Int = 0, operatorPresent: Boolean = false) {
        require(isSignedByUs(apk)) { "APK is not signed by this app's certificate" }
        val installer = context.packageManager.packageInstaller
        // Sessions are a finite, per-app resource and a failed one is never cleaned
        // up by the system. Abandoning our own leftovers before creating another
        // stops a device that has failed a few installs from being unable to start
        // any — a state nothing in the app could report or recover from.
        abandonOurSessions(installer)
        val params =
            PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        // Marks this as a managed/policy install rather than a user-initiated one;
        // it is what a Device Owner session needs to commit without asking.
        params.setInstallReason(PackageManager.INSTALL_REASON_POLICY)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(
                PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED,
            )
        }
        // Naming the target package lets Android reject a mismatched APK before a
        // single byte is written, rather than after the whole download.
        params.setAppPackageName(context.packageName)

        val sessionId = installer.createSession(params)
        try {
            writeAndCommit(installer, sessionId, apk, versionCode, operatorPresent)
        } catch (t: Throwable) {
            runCatching { installer.abandonSession(sessionId) }
            throw t
        }
    }

    private fun writeAndCommit(
        installer: PackageInstaller,
        sessionId: Int,
        apk: File,
        versionCode: Int,
        operatorPresent: Boolean,
    ) {
        installer.openSession(sessionId).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("signagewall-player.apk", 0, apk.length()).use { output ->
                    input.copyTo(output)
                    session.fsync(output)
                }
            }
            val pending = PendingIntent.getBroadcast(
                context,
                sessionId,
                // The version rides along because PackageInstaller's result
                // broadcast does not say which session it is about, and a failure
                // that cannot be attributed to a version cannot be counted against
                // one — which is what let a doomed APK retry forever.
                Intent(context, InstallReceiver::class.java)
                    .putExtra(InstallReceiver.EXTRA_VERSION_CODE, versionCode)
                    // Whether anybody is there to answer, in case Android asks.
                    .putExtra(InstallReceiver.EXTRA_OPERATOR_PRESENT, operatorPresent),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            session.commit(pending.intentSender)
        }
    }

    /** Our own stale sessions, from installs that failed or were never confirmed. */
    private fun abandonOurSessions(installer: PackageInstaller) {
        try {
            installer.mySessions.forEach { info ->
                runCatching { installer.abandonSession(info.sessionId) }
            }
        } catch (_: Throwable) {
            // Not being able to tidy up is never a reason to refuse to update.
        }
    }
}
