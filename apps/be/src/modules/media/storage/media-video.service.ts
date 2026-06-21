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
   * Re-encodes a video to H.264/AAC MP4, downscaling to a max height and
   * applying a CRF quality target, to reduce R2 storage. ffmpeg works on files
   * (not reliably on pure streams), so the input is staged in a temp dir that
   * is always cleaned up.
   *
   * Returns `null` when the re-encode did NOT come out smaller than the source
   * (already-efficient uploads), so the caller keeps the original bytes rather
   * than storing a larger file.
   */
  async transcodeIfSmaller(
    buffer: Buffer,
    originalSize: number,
  ): Promise<TranscodedVideo | null> {
    const dir = await mkdtemp(join(tmpdir(), 'media-video-'));
    const inputPath = join(dir, `${randomUUID()}.input`);
    const outputPath = join(dir, `${randomUUID()}.mp4`);

    try {
      await writeFile(inputPath, buffer);

      await this.runFfmpeg(inputPath, outputPath);

      const output = await readFile(outputPath);
      if (output.length >= originalSize) {
        this.logger.debug(
          `Transcode did not shrink video (${String(output.length)} >= ${String(
            originalSize,
          )} bytes); keeping original`,
        );
        return null;
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

  private runFfmpeg(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          `-crf ${String(VIDEO_TRANSCODE_CRF)}`,
          '-preset medium',
          // Downscale to the max height while preserving aspect ratio; never
          // enlarge. -2 keeps the width even (required by libx264/yuv420p).
          // The comma inside min() must be escaped or ffmpeg reads it as a
          // filter-chain separator.
          `-vf scale=-2:min(${String(VIDEO_TRANSCODE_MAX_HEIGHT)}\\,ih)`,
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
