package com.edgerize.player.provisioning

import android.app.admin.DevicePolicyManager
import android.content.Context

/**
 * Device-Owner status + the provisioning contract (documented here; the act of
 * provisioning happens out-of-band). The shell is its own DPC
 * (`kiosk.EdgeDeviceAdminReceiver`):
 *  - **QR** (hard-kiosk boxes): factory-reset → 6-tap on the setup wizard → scan a QR
 *    that carries this APK's download URL + checksum → Android sets it as Device Owner.
 *  - **Bench (adb)**:
 *    `adb shell dpm set-device-owner com.edgerize.player/.kiosk.EdgeDeviceAdminReceiver`
 *  - **Tablets**: skip provisioning entirely and run SOFT only.
 */
class ProvisioningManager(private val context: Context) {
    fun isDeviceOwner(): Boolean {
        val dpm =
            context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }
}
