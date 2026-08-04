import { randomUUID } from 'crypto';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { Injectable, Logger } from '@nestjs/common';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

import {
  VIDEO_TRANSCODE_CRF,
  VIDEO_TRANSCODE_MAX_HEIGHT,
  VIDEO_TRANSCODE_MAX_WIDTH,
} from '../media.constants';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export interface TranscodedVideo {
  buffer: Buffer;
  width?: number;
  height?: number;
  durationSeconds?: number;
}

@Injectable()
export class MediaVideoService {
  private readonly logger = new Logger(MediaVideoService.name);

  /**
   * Re-encodes a video to H.264/AAC MP4, inside the envelope a signage player can
   * decode in hardware, at a CRF quality target. ffmpeg works on files (not
   * reliably on pure streams), so the input is staged in a temp dir that is always
   * cleaned up.
   *
   * Returns `null` only when the re-encode was a pure storage optimisation that
   * did not pay off — i.e. the source was ALREADY within the decodable envelope
   * and the output came out no smaller. In that case the caller keeps the original
   * bytes rather than storing a larger file.
   *
   * When the source is OUTSIDE the envelope the result is kept regardless of size.
   * That case is not an optimisation: a 4K clip that happens to compress badly
   * used to be left at 4K forever, and a 4K H.264 file is not a large video on a
   * signage box — it is an unplayable one. Trading a few megabytes of R2 for a
   * screen that can decode its own content is not a close call.
   */
  /** Dimensions of a source, without re-encoding it. */
  async probeBuffer(buffer: Buffer): Promise<{
    width?: number;
    height?: number;
  }> {
    const dir = await mkdtemp(join(tmpdir(), 'media-probe-'));
    const path = join(dir, `${randomUUID()}.input`);
    try {
      await writeFile(path, buffer);
      return await this.probe(path);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async transcodeIfSmaller(
    buffer: Buffer,
    originalSize: number,
  ): Promise<TranscodedVideo | null> {
    const dir = await mkdtemp(join(tmpdir(), 'media-video-'));
    const inputPath = join(dir, `${randomUUID()}.input`);
    const outputPath = join(dir, `${randomUUID()}.mp4`);

    try {
      await writeFile(inputPath, buffer);

      // Probed BEFORE the re-encode, because whether the result may be discarded
      // depends on what the source was: an oversized source must be replaced even
      // if the replacement is bigger.
      const source = await this.probe(inputPath);
      const mustDownscale = this.exceedsDecodableEnvelope(source);

      await this.runFfmpeg(inputPath, outputPath);

      const output = await readFile(outputPath);
      if (!mustDownscale && output.length >= originalSize) {
        this.logger.debug(
          `Transcode did not shrink video (${String(output.length)} >= ${String(
            originalSize,
          )} bytes); keeping original`,
        );
        return null;
      }

      if (mustDownscale && output.length >= originalSize) {
        this.logger.log(
          `Kept a larger transcode (${String(output.length)} >= ${String(
            originalSize,
          )} bytes): the source ${String(source.width)}x${String(source.height)} ` +
            'is outside what signage hardware can decode.',
        );
      }

      const probe = await this.probe(outputPath);

      return {
        buffer: output,
        width: probe.width,
        height: probe.height,
        durationSeconds: probe.durationSeconds,
      };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Whether the source is bigger than a signage player's hardware decoder accepts,
   * in EITHER dimension. Unknown dimensions (a probe that told us nothing) count as
   * safe — refusing to store a video because we could not measure it would be a
   * worse failure than storing one that might need software decoding.
   */
  exceedsDecodableEnvelope(source: {
    width?: number;
    height?: number;
  }): boolean {
    const { width, height } = source;
    if (width === undefined || height === undefined) {
      return false;
    }
    return (
      width > VIDEO_TRANSCODE_MAX_WIDTH || height > VIDEO_TRANSCODE_MAX_HEIGHT
    );
  }

  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          `-crf ${String(VIDEO_TRANSCODE_CRF)}`,
          '-preset medium',
          // Fit inside the decodable envelope in BOTH dimensions, preserving
          // aspect ratio, never enlarging, and keeping each side even (which
          // libx264/yuv420p requires).
          //
          // Two subtleties, both measured rather than assumed:
          //  - The old filter capped only the HEIGHT, so an ultra-wide clip kept a
          //    width no decoder would take: 3000x1000 in, 3000x1000 out.
          //  - `force_original_aspect_ratio=decrease` alone still scales UP to fill
          //    the box — a 1280x720 upload came out 1920x1080, spending bytes and
          //    bandwidth to invent detail that was never there. The `min(...,iw/ih)`
          //    caps the target box at the source's own size, so shrinking is the
          //    only thing that can happen.
          `-vf scale='min(${String(VIDEO_TRANSCODE_MAX_WIDTH)},iw)':'min(${String(
            VIDEO_TRANSCODE_MAX_HEIGHT,
          )},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
          '-pix_fmt yuv420p',
          // Allow web playback to start before the whole file downloads.
          '-movflags +faststart',
        ])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outputPath);
    });
  }

  private probe(path: string): Promise<{
    width?: number;
    height?: number;
    durationSeconds?: number;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, data) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }

        const stream = data.streams.find((s) => s.codec_type === 'video');
        const durationSeconds = data.format.duration;

        resolve({
          width: stream?.width,
          height: stream?.height,
          durationSeconds:
            typeof durationSeconds === 'number'
              ? Math.round(durationSeconds)
              : undefined,
        });
      });
    });
  }
}
