import { useState } from "preact/hooks";

import splashImage from "../assets/images/splashscreen.jpg";
import { connection, pairingCode, paired } from "../store";

/** Copies text to the clipboard, falling back to a hidden textarea on older TVs. */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path (e.g. insecure origin / kiosk browser).
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Branded full-screen splash shown whenever there is nothing to play: while the
 * device is unpaired (showing a registration code) and while paired-but-empty
 * (showing the splash, never black). Two-column layout: info left, image right.
 */
export function PairingScreen() {
  const code = pairingCode.value?.code;
  const isOnline = connection.value === "online";
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    if (!code) return;
    void copyToClipboard(code).then((ok) => {
      if (ok) {
        setCopied(true);
        window.setTimeout(() => {
          setCopied(false);
        }, 1500);
      }
    });
  };

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
              <button
                type="button"
                class="player-pairing__code player-pairing__code--button"
                onClick={handleCopy}
                title="Click to copy"
                aria-label={`Registration code ${code}. Click to copy.`}
              >
                {code}
              </button>
            ) : (
              <div
                class="player-pairing__code player-pairing__code--loading"
                aria-hidden="true"
              >
                <span class="player-pairing__code-ghost">RZB-UZP</span>
                <span class="player-pairing__skeleton" />
              </div>
            )}
            <p class="player-pairing__hint" aria-live="polite">
              {copied
                ? "Code copied to clipboard."
                : "Enter this code in your Edge dashboard to connect this screen."}
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
