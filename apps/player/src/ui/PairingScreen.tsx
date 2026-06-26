import splashImage from "../assets/images/splashscreen.jpg";
import { connection, pairingCode, paired } from "../store";

/**
 * Branded full-screen splash shown whenever there is nothing to play: while the
 * device is unpaired (showing a registration code) and while paired-but-empty
 * (showing the splash, never black). Two-column layout: info left, image right.
 */
export function PairingScreen() {
  const code = pairingCode.value?.code;
  const isOnline = connection.value === "online";

  return (
    <div class="player-pairing">
      <div class="player-pairing__panel">
        <div class="player-pairing__brand">Edge</div>

        {paired.value ? (
          <>
            <p class="player-pairing__label">Ready</p>
            <p class="player-pairing__hint">
              This screen is connected. Publish content from your dashboard to
              start playback.
            </p>
          </>
        ) : (
          <>
            <p class="player-pairing__label">Registration code</p>
            {code ? (
              <div class="player-pairing__code">{code}</div>
            ) : (
              <div
                class="player-pairing__code player-pairing__code--loading"
                aria-hidden="true"
              >
                <span class="player-pairing__code-ghost">RZB-UZP</span>
                <span class="player-pairing__skeleton" />
              </div>
            )}
            <p class="player-pairing__hint">
              Enter this code in your Edge dashboard to connect this screen.
            </p>
          </>
        )}

        <div class="player-pairing__status" data-state={connection.value}>
          <span class="player-pairing__dot" data-online={isOnline} />
          {isOnline ? "Connected" : "Connecting…"}
        </div>
      </div>

      <div class="player-pairing__visual">
        <img class="player-pairing__image" src={splashImage} alt="Edge" />
      </div>
    </div>
  );
}
