import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** What the CMS needs to offer the current player build for download. */
export interface AndroidRelease {
  versionName: string;
  versionCode: number;
  /** Direct link to the APK, on the public release bucket. */
  url: string;
  /** Bytes, so the page can say how big the download is before it starts. */
  size?: number;
  sha256?: string;
  publishedAt?: string;
}

/**
 * Reads the Android release channel on the CMS's behalf.
 *
 * The channel is a single public JSON file that every device already polls, so
 * nothing here is secret — but the bucket serves no CORS headers, so a browser
 * cannot read it and the CMS would otherwise have to hard-code a version number
 * that goes stale the moment anything ships. Asking the server keeps the download
 * page honest for free.
 *
 * Cached for a few minutes. A release changes a handful of times a week at most,
 * while the download page can be opened by every operator in every organisation,
 * and there is no reason for that to become traffic against the bucket.
 */
@Injectable()
export class PlayerReleaseService {
  private readonly logger = new Logger(PlayerReleaseService.name);

  private cached?: { at: number; release: AndroidRelease };

  constructor(private readonly config: ConfigService) {}

  async androidRelease(): Promise<AndroidRelease | null> {
    const now = Date.now();
    if (this.cached && now - this.cached.at < CACHE_MILLIS) {
      return this.cached.release;
    }

    const base = this.config.get<string>('playerReleasesUrl');
    if (!base) {
      return null;
    }

    try {
      const response = await fetch(`${base}${MANIFEST_PATH}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MILLIS),
      });
      if (!response.ok) {
        throw new Error(`manifest HTTP ${response.status}`);
      }
      // The manifest calls it `pubDate`; everything downstream of here calls dates
      // `...At`, so it is renamed once, at the boundary.
      const manifest = (await response.json()) as Partial<AndroidRelease> & {
        pubDate?: string;
      };
      if (!manifest.versionName || !manifest.url) {
        throw new Error('manifest is missing a version or a url');
      }

      const release: AndroidRelease = {
        versionName: manifest.versionName,
        versionCode: manifest.versionCode ?? 0,
        url: manifest.url,
        ...(manifest.size === undefined ? {} : { size: manifest.size }),
        ...(manifest.sha256 === undefined ? {} : { sha256: manifest.sha256 }),
        ...(manifest.pubDate === undefined
          ? {}
          : { publishedAt: manifest.pubDate }),
      };
      this.cached = { at: now, release };
      return release;
    } catch (error) {
      // Serve a stale copy rather than nothing: a download page that briefly
      // offers the previous build is far more use than one that offers none, and
      // the APK it points at does not stop existing when the manifest is
      // unreachable.
      this.logger.warn(
        `could not read the release channel: ${String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return this.cached?.release ?? null;
    }
  }
}

const MANIFEST_PATH = '/signagewall-player/android/latest.json';
const CACHE_MILLIS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MILLIS = 8_000;
