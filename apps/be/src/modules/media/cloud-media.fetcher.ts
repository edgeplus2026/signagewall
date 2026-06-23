import { Injectable } from '@nestjs/common';

import {
  CLOUD_IMPORT_DOWNLOAD_TIMEOUT_MS,
  CLOUD_IMPORT_MAX_REDIRECTS,
  CLOUD_IMPORT_METADATA_TIMEOUT_MS,
  CloudImportError,
  HOST_ALLOWLIST,
  isHostAllowed,
} from './cloud-import.constants';
import {
  CloudImportItemDto,
  CloudImportProvider,
  CloudImportStrategy,
} from './dto/import-cloud-media.dto';

interface FetchedAsset {
  buffer: Buffer;
  contentType?: string;
}

/**
 * Downloads the raw bytes for a single cloud-picked item, server-side. All
 * client-supplied URLs are constrained to a per-provider host allowlist with
 * HTTPS-only, port, userinfo and redirect checks to prevent SSRF. Bearer tokens
 * are only ever attached to allow-listed hosts and dropped on cross-host
 * redirects so they can't be exfiltrated.
 */
@Injectable()
export class CloudMediaFetcher {
  async fetch(
    item: CloudImportItemDto,
    maxBytes: number,
  ): Promise<FetchedAsset> {
    switch (item.strategy) {
      case CloudImportStrategy.URL: {
        if (!item.downloadUrl) {
          throw new CloudImportError('download_failed');
        }
        return this.downloadBinary(
          item.downloadUrl,
          item.authToken ? { Authorization: `Bearer ${item.authToken}` } : {},
          HOST_ALLOWLIST[item.provider],
          maxBytes,
        );
      }

      case CloudImportStrategy.GOOGLE_DRIVE: {
        if (!item.fileId || !item.accessToken) {
          throw new CloudImportError('download_failed');
        }
        // Build the URL ourselves so the client never supplies one — no SSRF
        // surface, and the token only ever reaches www.googleapis.com.
        const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          item.fileId,
        )}?alt=media`;
        return this.downloadBinary(
          url,
          { Authorization: `Bearer ${item.accessToken}` },
          HOST_ALLOWLIST[CloudImportProvider.GOOGLE_DRIVE],
          maxBytes,
        );
      }

      case CloudImportStrategy.MSGRAPH: {
        return this.downloadGraphItem(item, maxBytes);
      }

      default: {
        throw new CloudImportError('download_failed');
      }
    }
  }

  private async downloadGraphItem(
    item: CloudImportItemDto,
    maxBytes: number,
  ): Promise<FetchedAsset> {
    if (!item.endpoint || !item.driveId || !item.itemId || !item.accessToken) {
      throw new CloudImportError('download_failed');
    }

    const allowed = HOST_ALLOWLIST[item.provider];
    const metadataUrl = `${item.endpoint.replace(/\/$/, '')}/drives/${encodeURIComponent(
      item.driveId,
    )}/items/${encodeURIComponent(
      item.itemId,
    )}?select=name,size,file,@microsoft.graph.downloadUrl`;

    this.assertAllowedUrl(metadataUrl, allowed);

    const response = await fetch(metadataUrl, {
      headers: { Authorization: `Bearer ${item.accessToken}` },
      signal: AbortSignal.timeout(CLOUD_IMPORT_METADATA_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new CloudImportError('download_failed');
    }

    const metadata = (await response.json()) as Record<string, unknown>;
    const downloadUrl = metadata['@microsoft.graph.downloadUrl'];
    if (typeof downloadUrl !== 'string') {
      throw new CloudImportError('download_failed');
    }

    // The downloadUrl is pre-authenticated — no Authorization header.
    return this.downloadBinary(downloadUrl, {}, allowed, maxBytes);
  }

  private async downloadBinary(
    initialUrl: string,
    headers: Record<string, string>,
    allowedHosts: readonly string[],
    maxBytes: number,
  ): Promise<FetchedAsset> {
    let url = initialUrl;
    let currentHeaders = { ...headers };

    for (let hop = 0; hop <= CLOUD_IMPORT_MAX_REDIRECTS; hop += 1) {
      this.assertAllowedUrl(url, allowedHosts);

      const response = await fetch(url, {
        headers: currentHeaders,
        redirect: 'manual',
        signal: AbortSignal.timeout(CLOUD_IMPORT_DOWNLOAD_TIMEOUT_MS),
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new CloudImportError('download_failed');
        }
        const next = new URL(location, url);
        // Drop the bearer token when crossing hosts so it can't leak to a
        // redirect target (the next host is re-validated on the next loop).
        const crossesHost =
          next.hostname.toLowerCase() !== new URL(url).hostname.toLowerCase();
        if (crossesHost) {
          currentHeaders = Object.fromEntries(
            Object.entries(currentHeaders).filter(
              ([key]) => key !== 'Authorization',
            ),
          );
        }
        url = next.toString();
        continue;
      }

      if (!response.ok) {
        throw new CloudImportError('download_failed');
      }

      // Reject oversized payloads via the advertised length, then re-check the
      // actual bytes in case the header lied.
      const advertised = Number(response.headers.get('content-length'));
      if (Number.isFinite(advertised) && advertised > maxBytes) {
        throw new CloudImportError('file_too_large');
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxBytes) {
        throw new CloudImportError('file_too_large');
      }

      return {
        buffer: Buffer.from(arrayBuffer),
        contentType: response.headers.get('content-type') ?? undefined,
      };
    }

    // Too many redirects.
    throw new CloudImportError('download_failed');
  }

  /** HTTPS-only, no userinfo, port 443 only, host on the provider allowlist. */
  private assertAllowedUrl(
    rawUrl: string,
    allowedHosts: readonly string[],
  ): void {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new CloudImportError('forbidden_host');
    }

    if (url.protocol !== 'https:') {
      throw new CloudImportError('forbidden_host');
    }
    if (url.username || url.password) {
      throw new CloudImportError('forbidden_host');
    }
    if (url.port && url.port !== '443') {
      throw new CloudImportError('forbidden_host');
    }
    if (!isHostAllowed(url.hostname, allowedHosts)) {
      throw new CloudImportError('forbidden_host');
    }
  }
}
