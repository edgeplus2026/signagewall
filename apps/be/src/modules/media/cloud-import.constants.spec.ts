import {
  HOST_ALLOWLIST,
  isHostAllowed,
  mapWithConcurrency,
} from './cloud-import.constants';
import { CloudImportProvider } from './dto/import-cloud-media.dto';

describe('isHostAllowed', () => {
  const dropbox = HOST_ALLOWLIST[CloudImportProvider.DROPBOX];
  const onedrive = HOST_ALLOWLIST[CloudImportProvider.ONEDRIVE];
  const drive = HOST_ALLOWLIST[CloudImportProvider.GOOGLE_DRIVE];

  it('accepts subdomains of a "." suffix entry', () => {
    expect(isHostAllowed('dl.dropboxusercontent.com', dropbox)).toBe(true);
    expect(isHostAllowed('uc123.dropboxusercontent.com', dropbox)).toBe(true);
  });

  it('accepts the apex of a "." suffix entry', () => {
    expect(isHostAllowed('dropboxusercontent.com', dropbox)).toBe(true);
  });

  it('requires an exact match for non-suffix entries', () => {
    expect(isHostAllowed('www.googleapis.com', drive)).toBe(true);
    expect(isHostAllowed('evil-googleapis.com', drive)).toBe(false);
    expect(isHostAllowed('googleapis.com.evil.com', drive)).toBe(false);
  });

  it('rejects look-alike hosts that merely contain the allowed domain', () => {
    expect(isHostAllowed('evil.com', dropbox)).toBe(false);
    expect(isHostAllowed('dropboxusercontent.com.evil.com', dropbox)).toBe(
      false,
    );
    expect(isHostAllowed('notdropboxusercontent.com', dropbox)).toBe(false);
  });

  it('rejects internal / metadata hosts', () => {
    expect(isHostAllowed('169.254.169.254', onedrive)).toBe(false);
    expect(isHostAllowed('localhost', onedrive)).toBe(false);
    expect(isHostAllowed('graph.microsoft.com.attacker.net', onedrive)).toBe(
      false,
    );
  });

  it('is case-insensitive', () => {
    expect(isHostAllowed('DL.DropboxUserContent.com', dropbox)).toBe(true);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves input order in the result', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, (n) =>
      Promise.resolve(n * 10),
    );
    expect(result).toEqual([10, 20, 30, 40]);
  });

  it('never runs more than the limit at once', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency(
      Array.from({ length: 10 }, (_, i) => i),
      3,
      async () => {
        active += 1;
        peak = Math.max(peak, active);
        await Promise.resolve();
        active -= 1;
      },
    );
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('handles an empty input', async () => {
    expect(await mapWithConcurrency([], 4, () => Promise.resolve(1))).toEqual(
      [],
    );
  });
});
