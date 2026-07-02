// Verhindert das Konsolenfenster unter Windows im Release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    kosmo_orbit_lib::run()
}
