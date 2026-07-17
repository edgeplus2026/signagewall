import { parseChannel, toLiveChannelEmbedUrl } from '@edge/apps';

// The Live channel app's URL builder is a pure helper in @edge/apps; the backend
// is the repo's jest home, so it's exercised here (like the news-source guard).

describe('parseChannel', () => {
  it('returns a bare handle unchanged', () => {
    expect(parseChannel('shroud')).toBe('shroud');
  });

  it('extracts the handle from a full or partial URL', () => {
    expect(parseChannel('https://twitch.tv/shroud')).toBe('shroud');
    expect(parseChannel('kick.com/xqc')).toBe('xqc');
    expect(parseChannel('https://kick.com/xqc/')).toBe('xqc');
    expect(parseChannel('twitch.tv/shroud?foo=1')).toBe('shroud');
  });

  it('strips a leading @ and trims', () => {
    expect(parseChannel('  @ninja ')).toBe('ninja');
  });
});

describe('toLiveChannelEmbedUrl', () => {
  it('builds a Twitch URL with the required parent and mute state', () => {
    const url = toLiveChannelEmbedUrl('twitch', 'shroud', {
      muted: true,
      parent: 'screens.example.com',
    });
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe('https://player.twitch.tv/');
    expect(parsed.searchParams.get('channel')).toBe('shroud');
    expect(parsed.searchParams.get('parent')).toBe('screens.example.com');
    expect(parsed.searchParams.get('muted')).toBe('true');
    expect(parsed.searchParams.get('autoplay')).toBe('true');
  });

  it('falls back to a localhost parent when none is usable', () => {
    const url = toLiveChannelEmbedUrl('twitch', 'shroud', { muted: false });
    expect(new URL(url!).searchParams.get('parent')).toBe('localhost');
    expect(new URL(url!).searchParams.get('muted')).toBe('false');
  });

  it('builds a Kick URL (no parent needed)', () => {
    const url = toLiveChannelEmbedUrl('kick', 'https://kick.com/xqc', {
      muted: true,
    });
    expect(url).toBe('https://player.kick.com/xqc?autoplay=true&muted=true');
  });

  it('returns null for a missing or malformed channel', () => {
    expect(toLiveChannelEmbedUrl('twitch', '', { muted: true })).toBeNull();
    expect(
      toLiveChannelEmbedUrl('twitch', 'bad name!', { muted: true }),
    ).toBeNull();
    // A hyphen is invalid for Twitch but valid for Kick.
    expect(toLiveChannelEmbedUrl('twitch', 'a-b', { muted: true })).toBeNull();
    expect(toLiveChannelEmbedUrl('kick', 'a-b', { muted: true })).not.toBeNull();
  });
});
