package com.signagewall.player.update

import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.os.Build
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
 *     installer of record. A box sideloaded over adb has `installer=null`, and that
 *     cannot be fixed from outside: both `adb install -i` and `pm set-installer`
 *     were measured to leave it null (the latter throws). So the FIRST update on
 *     any sideloaded device still prompts; performing it is what makes us the
 *     installer, and updates after that can be silent.
 *  3. Otherwise the system shows the prompt, routed through [InstallReceiver] via
 *     `REQUEST_INSTALL_PACKAGES`.
 *
 * `setRequireUserAction` is a REQUEST, not a guarantee — the system may still
 * decide to ask (a changed signing cert, a permission-set change). That is why
 * [InstallReceiver] stays: it is the fallback, not dead code.
 *
 * On success the OS relaunches the app. The APK-signature check (PackageInstaller
 * refuses a different signing cert) is the Android trust anchor, backed by the
 * caller's sha256 check.
 */
class InstallerStrategy(private val context: Context) {

    fun isDeviceOwner(): Boolean {
        val dpm =
            context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }

    fun install(apk: File) {
        val installer = context.packageManager.packageInstaller
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
        val sessionId = installer.createSession(params)
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
                Intent(context, InstallReceiver::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
            )
            session.commit(pending.intentSender)
        }
    }
}
