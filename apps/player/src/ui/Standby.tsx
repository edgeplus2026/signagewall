/**
 * Standby view: the screen is outside its scheduled working hours. Pure black
 * (minimum burn-in/power) — mounting this INSTEAD of Stage is what pauses the
 * engine: Stage's unmount destroys the playback controller, which fully tears
 * down media decode.
 */
export function Standby() {
  return <div class="player-standby" />
}
