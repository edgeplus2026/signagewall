package rs.futureforward.edge.player.kiosk

import android.app.admin.DeviceAdminReceiver

/**
 * The app's own Device Policy Controller. Its mere presence (declared in the
 * manifest with `device_admin.xml` + `BIND_DEVICE_ADMIN`) is what lets the shell
 * be provisioned as **Device Owner** — via QR provisioning on a fresh box, or
 * `adb shell dpm set-device-owner rs.futureforward.edge.player/.kiosk.EdgeDeviceAdminReceiver`
 * on the bench. Once Device Owner, [KioskController] can enforce the un-escapable
 * HARD lock and (Level 3) silent self-updates. No callbacks are needed for that.
 */
class EdgeDeviceAdminReceiver : DeviceAdminReceiver()
