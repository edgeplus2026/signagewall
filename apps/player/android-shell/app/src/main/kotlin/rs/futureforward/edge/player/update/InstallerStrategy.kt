package rs.futureforward.edge.player.update

import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import java.io.File

/**
 * Installs an APK via PackageInstaller. On a Device Owner the session commits
 * SILENTLY (no user action); otherwise the system shows the install prompt (routed
 * through [InstallReceiver] via `REQUEST_INSTALL_PACKAGES`). On success the OS
 * relaunches the app. The APK-signature check (PackageInstaller refuses a different
 * signing cert) is the Android trust anchor, backed by the caller's sha256 check.
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
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            apk.inputStream().use { input ->
                session.openWrite("edge-player.apk", 0, apk.length()).use { output ->
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
