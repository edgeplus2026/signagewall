package rs.futureforward.edge.player.update

import rs.futureforward.edge.player.util.AtomicFile
import rs.futureforward.edge.player.util.json
import java.io.File

/**
 * Atomic persistence of [UpdaterState] (`updates/state.json`). A corrupt or missing
 * file reads as a fresh default — never a crash — so a bad state can't wedge boot.
 */
class UpdaterStateStore(private val file: File) {
    fun read(): UpdaterState =
        try {
            if (file.exists()) {
                json.decodeFromString(UpdaterState.serializer(), file.readText())
            } else {
                UpdaterState()
            }
        } catch (_: Throwable) {
            UpdaterState()
        }

    fun write(state: UpdaterState) {
        AtomicFile.write(
            file,
            json.encodeToString(UpdaterState.serializer(), state).toByteArray(Charsets.UTF_8),
        )
    }
}
