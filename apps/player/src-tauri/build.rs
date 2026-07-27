fn main() {
    // Register the app's own commands with the ACL so they can be GRANTED to the
    // remote player origin in `capabilities/default.json`. Without this, Tauri v2
    // treats a `WebviewUrl::External` page as untrusted remote content in RELEASE
    // builds and blocks every `window.__TAURI__` command call — silently, since
    // the web `nativeInvoke` swallows the rejection. (In `tauri dev` the devUrl is
    // trusted, so it "works" there and only breaks in the packaged build.)
    //
    // `commands()` auto-generates `allow-<command>` / `deny-<command>` permissions
    // (in the app's own permission namespace, no plugin prefix) that the capability
    // then lists. Keep this in sync with the `invoke_handler!` list in `lib.rs`.
    let attributes =
        tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(&[
            "get_device_id",
            "set_device_id",
            "shell_version",
            "report_liveness",
            "check_update",
            "run_update",
            "report_alive",
            "report_healthy",
            "get_update_state",
        ]));
    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
