import { randomUUID } from 'crypto';
import { access, chmod, constants, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';

import {
  TRANSCODED_VIDEO_MIME_TYPE,
  VIDEO_TRANSCODE_CRF,
  VIDEO_TRANSCODE_MAX_HEIGHT,
  VIDEO_TRANSCODE_MAX_WIDTH,
  VIDEO_TRANSCODE_PRESET,
  VIDEO_TRANSCODE_MAX_CONCURRENT,
  VIDEO_TRANSCODE_THREADS,
} from '../media.constants';
import { ConcurrencyGate } from './transcode-gate';

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
ffmpeg.setFfprobePath(ffprobeInstaller.path);

/** The only codecs every signage player is guaranteed to decode in hardware. */
const CONFORMANT_VIDEO_CODEC = 'h264';
const CONFORMANT_AUDIO_CODEC = 'aac';

export interface NormalizedVideo {
  width?: number;
  height?: number;
  durationSeconds?: number;
  /** True when the source was already conformant and only the container was
   *  rewritten — useful for logging, never for deciding what to store. */
  remuxedOnly: boolean;
}

export interface ProbedVideo {
  width?: number;
  height?: number;
  durationSeconds?: number;
  videoCodec?: string;
  audioCodec?: string;
  hasAudio: boolean;
}

@Injectable()
export class MediaVideoService implements OnModuleInit {
  private readonly logger = new Logger(MediaVideoService.name);

  /**
   * Bounds concurrent re-encodes. See VIDEO_TRANSCODE_MAX_CONCURRENT for the
   * measured budget this comes from; the short version is that each one peaks
   * at 415 MB on a 4K source and, until this existed, the only thing counting
   * them was a constant in the CMS.
   */
  private readonly transcodeGate = new ConcurrencyGate(
    VIDEO_TRANSCODE_MAX_CONCURRENT,
  );

  /**
   * Fails loudly at boot when the encoder binaries are missing or not runnable.
   *
   * They ship inside `node_modules`, and package managers that hard-link or copy
   * that tree during a container build (pnpm on Railway/Docker, notably) routinely
   * drop the execute bit. The symptom is silent and total: every single video
   * upload throws deep inside ffmpeg, and the only trace is one warning per item.
   * A screen full of untranscoded originals is the visible result, weeks later.
   *
   * Deliberately logged rather than thrown: the encoder is one dependency of one
   * feature, and taking the whole API down with it would turn a video problem into
   * an outage. Uploads then fail per-item, visibly, which is what the operator can
   * actually act on.
   */
  async onModuleInit(): Promise<void> {
    await Promise.all([
      this.checkExecutable('ffmpeg', ffmpegPath),
      this.checkExecutable('ffprobe', ffprobeInstaller.path),
    ]);
  }

  private async checkExecutable(
    name: string,
    path: string | null,
  ): Promise<void> {
    if (!path) {
      this.logger.error(
        `${name} binary not found — EVERY video upload will fail until it is installed.`,
      );
      return;
    }

    try {
      await access(path, constants.X_OK);
      return;
    } catch {
      // Fall through and try to repair it.
    }

    // `scripts/ensure-ffmpeg-executable.mjs` normally settles this at install
    // time. Repeating it here costs one syscall at boot and covers the cases that
    // script cannot: an image built before it existed, a cached node_modules
    // layer, or a store re-link between install and run. Given the failure is
    // otherwise silent — the old pipeline answered EACCES by shipping the
    // untranscoded original to the screens — a redundant chmod is cheap insurance.
    try {
      await chmod(path, 0o755);
      this.logger.warn(
        `${name} at ${path} was not executable; restored the execute bit. ` +
          'Check that the postinstall step runs in the deployed image.',
      );
    } catch {
      this.logger.error(
        `${name} at ${path} is not executable and could not be fixed — ` +
          'EVERY video upload will fail until it is. A build that copies or ' +
          `hard-links node_modules commonly drops the execute bit; run ` +
          `\`chmod +x ${path}\` in the build step.`,
      );
    }
  }

  /** Codecs and dimensions of a file on disk, without re-encoding it. */
  probeFile(path: string): Promise<ProbedVideo> {
    return this.probe(path);
  }

  /**
   * Same, for bytes already in memory. Only for callers that genuinely hold a
   * buffer (tests, small probes) — the transcode path deliberately does not.
   */
  async probeBuffer(buffer: Buffer): Promise<ProbedVideo> {
    const dir = await mkdtemp(join(tmpdir(), 'media-probe-'));
    const path = join(dir, `${randomUUID()}.input`);
    try {
      await writeFile(path, buffer);
      return await this.probe(path);
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Turns ANY accepted video into an H.264/AAC MP4 that a signage player can
   * decode, and returns it. There is no path that keeps the source bytes.
   *
   * The previous policy asked whether re-encoding made the file SMALLER, and kept
   * the original when it did not. That question is unrelated to the one that
   * matters. A 1080p HEVC `.mov` — which is what every recent iPhone records —
   * sits comfortably inside the resolution envelope and re-encodes to a LARGER
   * H.264 file, because H.265 is roughly twice as efficient. So it was measured,
   * judged "not worthwhile", and the undecodable original was served to the
   * screens. Codec was never part of the decision; now it is the whole decision.
   *
   * Two routes, one guarantee:
   *  - already H.264/AAC and inside the envelope → REMUX (stream copy). Costs
   *    seconds, loses no quality, and still rewrites the container, which is how
   *    `+faststart` gets applied — without it a player must download the entire
   *    clip before it can show a single frame.
   *  - anything else → full re-encode, scaled into the envelope.
   *
   * A source is never trusted on its declared MIME type alone; the container is
   * rebuilt either way.
   *
   * Works file-to-file, never on buffers. A signage clip is tens of megabytes
   * and the caller streams it in from object storage and back out again, so
   * materialising it in the heap — as this used to, twice — added the whole file
   * size to a process that was already being OOM-killed by the encoder itself.
   * Both paths belong to the caller, which owns their lifetime.
   */
  async normalizeToMp4(
    inputPath: string,
    outputPath: string,
    mimeType?: string,
  ): Promise<NormalizedVideo> {
    const source = await this.probe(inputPath);
    const conformant = this.isConformant(source, mimeType);

    if (conformant) {
      await this.remux(inputPath, outputPath);
    } else {
      this.logger.log(
        `Re-encoding video (codec=${source.videoCodec ?? '?'}/` +
          `${source.hasAudio ? (source.audioCodec ?? '?') : 'silent'}, ` +
          `${String(source.width)}x${String(source.height)}, ` +
          `type=${mimeType ?? '?'}) to H.264/AAC MP4`,
      );
      await this.reencode(inputPath, outputPath);
    }

    const probe = await this.probe(outputPath);

    return {
      width: probe.width,
      height: probe.height,
      durationSeconds: probe.durationSeconds,
      remuxedOnly: conformant,
    };
  }

  /**
   * Whether the source can be stream-copied instead of re-encoded: right codecs,
   * right container, and inside the decodable envelope. A missing audio track is
   * fine — a silent clip is common signage content.
   */
  isConformant(source: ProbedVideo, mimeType?: string): boolean {
    if (mimeType !== TRANSCODED_VIDEO_MIME_TYPE) {
      return false;
    }
    if (source.videoCodec !== CONFORMANT_VIDEO_CODEC) {
      return false;
    }
    if (source.hasAudio && source.audioCodec !== CONFORMANT_AUDIO_CODEC) {
      return false;
    }
    return !this.exceedsDecodableEnvelope(source);
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

  /** Container rewrite only: same bytes for the streams, `+faststart` applied. */
  private remux(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          // First video + first audio only. A stray data/subtitle stream is not
          // representable in MP4 and would fail the copy outright.
          '-map 0:v:0',
          '-map 0:a:0?',
          '-c copy',
          '-movflags +faststart',
        ])
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outputPath);
    });
  }

  private async reencode(inputPath: string, outputPath: string): Promise<void> {
    if (this.transcodeGate.queued > 0) {
      this.logger.log(
        `Re-encode queued behind ${String(this.transcodeGate.inFlight)} in flight`,
      );
    }
    await this.transcodeGate.run(() => this.runEncoder(inputPath, outputPath));
  }

  private runEncoder(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-map 0:v:0',
          '-map 0:a:0?',
          `-crf ${String(VIDEO_TRANSCODE_CRF)}`,
          // Speed preset and thread cap are a MEMORY budget — see the measured
          // numbers on the constants. Uncapped, this is what got OOM-killed.
          `-preset ${VIDEO_TRANSCODE_PRESET}`,
          `-threads ${String(VIDEO_TRANSCODE_THREADS)}`,
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

  private probe(path: string): Promise<ProbedVideo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, data) => {
        if (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
          return;
        }

        const video = data.streams.find((s) => s.codec_type === 'video');
        const audio = data.streams.find((s) => s.codec_type === 'audio');
        const durationSeconds = data.format.duration;

        resolve({
          width: video?.width,
          height: video?.height,
          videoCodec: video?.codec_name,
          audioCodec: audio?.codec_name,
          hasAudio: audio !== undefined,
          durationSeconds:
            typeof durationSeconds === 'number'
              ? Math.round(durationSeconds)
              : undefined,
        });
      });
    });
  }
}
