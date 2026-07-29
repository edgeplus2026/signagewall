// On Windows, `windows_subsystem = "windows"` hides the console window in release
// builds (a signage kiosk must never flash a terminal). Debug keeps the console
// for logs.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    signagewall_player_lib::run()
}
