import { execFile } from 'child_process';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

import ffmpegPath from 'ffmpeg-static';

import { MediaVideoService } from './media-video.service';

const run = promisify(execFile);

/**
 * Real ffmpeg, real files. The bug this covers was entirely about which SOURCE
 * takes which route, so a mocked encoder would have proved nothing: the old code
 * ran ffmpeg correctly and then threw the result away.
 *
 * Fixtures are generated rather than committed — a couple of one-second clips
 * from `testsrc`, small and fast enough to build per run.
 */
describe('MediaVideoService', () => {
  const service = new MediaVideoService();
  let dir: string;

  const ffmpeg = ffmpegPath;
  // Without the binary there is nothing to assert; the service logs that loudly
  // at boot, which is its own guarantee.
  const maybe = ffmpeg ? describe : describe.skip;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'media-video-spec-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  });

  /** Encodes a one-second clip and returns its path. */
  async function fixture(name: string, args: string[]): Promise<string> {
    const path = join(dir, name);
    await run(ffmpeg as string, [
      '-y',
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'testsrc=size=640x360:rate=25:duration=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=440:duration=1',
      ...args,
      path,
    ]);
    return path;
  }

  maybe('normalizeToMp4', () => {
    jest.setTimeout(120_000);

    it('re-encodes a codec no signage player can decode', async () => {
      // An HEVC .mov — what a recent iPhone records. It fits the resolution
      // envelope and re-encodes to a LARGER H.264 file, which is exactly why the
      // old size-based rule discarded the transcode and served this to screens.
      const source = await fixture('hevc.mov', [
        '-c:v',
        'libx265',
        '-tag:v',
        'hvc1',
        '-crf',
        '30',
        '-c:a',
        'aac',
      ]);
      const output = join(dir, 'out-hevc.mp4');

      const result = await service.normalizeToMp4(
        source,
        output,
        'video/quicktime',
      );
      const probed = await service.probeFile(output);

      expect(result.remuxedOnly).toBe(false);
      expect(probed.videoCodec).toBe('h264');
      expect(probed.audioCodec).toBe('aac');
    });

    it('re-encodes a clip past the hardware decode envelope', async () => {
      const source = await fixture('uhd.mp4', [
        '-vf',
        'scale=3840:2160',
        '-c:v',
        'libx264',
        '-crf',
        '35',
        '-c:a',
        'aac',
      ]);
      const output = join(dir, 'out-uhd.mp4');

      const result = await service.normalizeToMp4(source, output, 'video/mp4');
      const probed = await service.probeFile(output);

      expect(result.remuxedOnly).toBe(false);
      expect(probed.width).toBeLessThanOrEqual(1920);
      expect(probed.height).toBeLessThanOrEqual(1088);
    });

    it('remuxes an already-conformant clip instead of re-encoding it', async () => {
      const source = await fixture('good.mp4', [
        '-c:v',
        'libx264',
        '-crf',
        '23',
        '-c:a',
        'aac',
      ]);
      const output = join(dir, 'out-good.mp4');

      const result = await service.normalizeToMp4(source, output, 'video/mp4');
      const probed = await service.probeFile(output);

      // Stream-copied: no generation loss, but the container is still rebuilt so
      // `+faststart` is applied — without it a player must download the whole
      // clip before it can show one frame.
      expect(result.remuxedOnly).toBe(true);
      expect(probed.videoCodec).toBe('h264');
    });

    it('keeps a silent clip, rather than treating missing audio as non-conformant', async () => {
      const source = join(dir, 'silent.mp4');
      await run(ffmpeg as string, [
        '-y',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'testsrc=size=640x360:rate=25:duration=1',
        '-c:v',
        'libx264',
        '-crf',
        '23',
        source,
      ]);
      const output = join(dir, 'out-silent.mp4');

      const result = await service.normalizeToMp4(source, output, 'video/mp4');
      const probed = await service.probeFile(output);

      expect(result.remuxedOnly).toBe(true);
      expect(probed.hasAudio).toBe(false);
    });

    it('rejects a file ffmpeg cannot read at all, rather than passing it through', async () => {
      const source = join(dir, 'garbage.mp4');
      await writeFile(source, 'this is not a video');

      await expect(
        service.normalizeToMp4(
          source,
          join(dir, 'out-garbage.mp4'),
          'video/mp4',
        ),
      ).rejects.toBeDefined();
    });
  });

  describe('isConformant', () => {
    const base = {
      width: 1920,
      height: 1080,
      videoCodec: 'h264',
      audioCodec: 'aac',
      hasAudio: true,
    };

    it('accepts H.264/AAC MP4 inside the envelope', () => {
      expect(service.isConformant(base, 'video/mp4')).toBe(true);
    });

    it('accepts a silent H.264 MP4', () => {
      expect(
        service.isConformant(
          { ...base, hasAudio: false, audioCodec: undefined },
          'video/mp4',
        ),
      ).toBe(true);
    });

    it('rejects a non-MP4 container even when the codecs are right', () => {
      expect(service.isConformant(base, 'video/quicktime')).toBe(false);
    });

    it('rejects an undecodable video codec', () => {
      // The case that reached real screens.
      expect(
        service.isConformant({ ...base, videoCodec: 'hevc' }, 'video/mp4'),
      ).toBe(false);
    });

    it('rejects an undecodable audio codec', () => {
      expect(
        service.isConformant({ ...base, audioCodec: 'opus' }, 'video/mp4'),
      ).toBe(false);
    });

    it('rejects anything past the decode envelope', () => {
      expect(
        service.isConformant(
          { ...base, width: 3840, height: 2160 },
          'video/mp4',
        ),
      ).toBe(false);
      // Ultra-wide: legal height, impossible width.
      expect(
        service.isConformant(
          { ...base, width: 3000, height: 1000 },
          'video/mp4',
        ),
      ).toBe(false);
    });
  });
});
