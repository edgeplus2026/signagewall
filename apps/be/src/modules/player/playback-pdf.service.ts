import { createHmac, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import type {
  CoverageReport,
  PlaybackItemsReport,
} from './playback-report.service';

/**
 * The report as a document somebody can file, and later prove was not edited.
 *
 * A CSV is for working with; this is for sending. The difference that matters is
 * the last block on the page: a digest of the exact numbers the document was
 * built from, and a signature over that digest made with a key only this server
 * holds. Anyone can re-derive the digest from the data and ask the verify
 * endpoint whether the signature matches — so a figure changed after the fact,
 * in the PDF or in the numbers, stops matching.
 *
 * It is deliberately NOT called a digital signature: there is no certificate and
 * no third party vouching for identity. It proves the document came from this
 * installation and has not been altered since, which is what a billing dispute
 * actually turns on.
 */

const MARGIN = 48;
const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, points.
const LINE = 14;
/** Height of the verification box drawn at the foot of the last page. */
const VERIFY_BOX = 74;
/**
 * Space kept clear at the bottom of every page.
 *
 * Sized for the verification box even on pages that do not carry it: which page
 * ends up last depends on how many rows there are, so reserving it only on the
 * last one would mean the table runs into the box exactly when the report is
 * long — the case nobody checks before sending.
 */
const FOOTER_RESERVE = MARGIN + VERIFY_BOX + LINE;

@Injectable()
export class PlaybackPdfService {
  private readonly logger = new Logger(PlaybackPdfService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Builds the PDF for a range, with the coverage headline if one was supplied.
   */
  async render(input: {
    organizationName: string;
    items: PlaybackItemsReport;
    coverage?: CoverageReport;
  }): Promise<{ bytes: Uint8Array; digest: string; signature: string }> {
    const digest = digestOf(input.items);
    const signature = this.sign(digest);

    const pdf = await PDFDocument.create();
    pdf.setTitle(`Proof of play ${input.items.from} – ${input.items.to}`);
    pdf.setProducer('SignageWall');
    // Fixed rather than "now": a document that renders differently on every
    // request cannot be compared against the copy a client already holds.
    pdf.setCreationDate(new Date(0));
    pdf.setModificationDate(new Date(0));

    // Names come from operators and their customers, so the document has to be
    // able to print them: the standard PDF fonts cannot encode č/ć/š/ž/đ, and a
    // report that renders "Šećerana" as "Secerana" undercuts exactly the
    // credibility the signature at the foot of the page is there to establish.
    const embedded = loadFonts();
    let regular: PDFFont;
    let bold: PDFFont;
    if (embedded) {
      pdf.registerFontkit(fontkit);
      regular = await pdf.embedFont(embedded.regular);
      bold = await pdf.embedFont(embedded.bold);
    } else {
      // The font files are build assets, and a build that forgets to copy them
      // must still produce a document — folded to the nearest Latin letter, as
      // this did before they existed, rather than failing the export outright.
      this.logger.warn(
        'Report fonts are missing; falling back to folded Latin text',
      );
      regular = await pdf.embedFont(StandardFonts.Helvetica);
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    }
    /** Digits, hex and durations only — never a name. */
    const mono = await pdf.embedFont(StandardFonts.Courier);
    /** Passes text through when the embedded font can render it. */
    const text = (value: string): string => (embedded ? value : fold(value));

    let page = pdf.addPage([PAGE.width, PAGE.height]);
    let y = PAGE.height - MARGIN;

    const write = (
      value: string,
      options: { font?: PDFFont; size?: number; x?: number; gap?: number } = {},
    ): void => {
      const size = options.size ?? 10;
      if (y < FOOTER_RESERVE) {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
      }
      page.drawText(text(value), {
        x: options.x ?? MARGIN,
        y,
        size,
        font: options.font ?? regular,
        color: rgb(0.08, 0.09, 0.12),
      });
      y -= options.gap ?? LINE;
    };

    write(input.organizationName, { font: bold, size: 16, gap: LINE + 6 });
    write(`Proof of play · ${input.items.from} – ${input.items.to}`, {
      font: regular,
      size: 11,
      gap: LINE + 10,
    });

    if (input.coverage) {
      write('COVERAGE', { font: bold, size: 9 });
      write(
        input.coverage.coverage === null
          ? 'No expected on-air time in this period.'
          : `${String(input.coverage.coverage)}% of expected on-air time had content, across ${String(input.coverage.totals.screens)} screens.`,
        { gap: LINE + 4 },
      );
      for (const exception of input.coverage.exceptions.slice(0, 12)) {
        write(
          `· ${exception.screenName}: ${exception.kind === 'off' ? 'unreachable' : `stuck on ${exception.itemName ?? '—'}`} ${clock(exception.fromHour)}–${clock(exception.toHour)}`,
          { size: 9 },
        );
      }
      y -= 10;
    }

    write('TOTALS', { font: bold, size: 9 });
    write(
      `${input.items.totals.plays.toLocaleString('en-US')} plays · ${hms(input.items.totals.airtimeMs)} measured airtime`,
      { gap: LINE + 10 },
    );

    write('BY ITEM', { font: bold, size: 9, gap: LINE + 2 });
    const columns = [
      MARGIN,
      MARGIN + 250,
      MARGIN + 320,
      MARGIN + 410,
      MARGIN + 470,
    ];
    const header = ['Item', 'Plays', 'Airtime', 'Share', 'Screens'];
    header.forEach((label, index) => {
      page.drawText(label, {
        x: columns[index],
        y,
        size: 8,
        font: bold,
        color: rgb(0.35, 0.38, 0.43),
      });
    });
    y -= LINE;

    for (const item of input.items.items.slice(0, 300)) {
      if (y < FOOTER_RESERVE) {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
      }
      const cells = [
        text(
          truncate(
            item.campaignName
              ? `${item.campaignName} · ${item.name}`
              : item.name,
            46,
          ),
        ),
        item.plays.toLocaleString('en-US'),
        hms(item.airtimeMs),
        `${item.share.toFixed(1)}%`,
        String(item.screens),
      ];
      cells.forEach((value, index) => {
        page.drawText(index === 0 ? value : fold(value), {
          x: columns[index],
          y,
          size: 9,
          font: index === 0 ? regular : mono,
          color: rgb(0.08, 0.09, 0.12),
        });
      });
      y -= LINE - 2;
    }

    this.drawVerification(page, { digest, signature, mono, bold });

    return { bytes: await pdf.save(), digest, signature };
  }

  /** Recomputes the signature so a holder of the document can check it. */
  verify(digest: string, signature: string): boolean {
    const expected = this.sign(digest);
    // Length-safe comparison; both are hex of the same length by construction.
    return expected.length === signature.length && expected === signature;
  }

  /** The digest of a report's numbers, for verifying without the PDF. */
  digest(items: PlaybackItemsReport): string {
    return digestOf(items);
  }

  sign(digest: string): string {
    return createHmac('sha256', this.secret()).update(digest).digest('hex');
  }

  /**
   * The signing key.
   *
   * Falls back to a per-installation constant when unset so the feature still
   * works out of the box, with a warning: an unset key means anyone running this
   * code could forge a signature, which is fine for a demo and not fine for a
   * document backing an invoice.
   */
  private secret(): string {
    const configured =
      this.config.get<string>('REPORT_SIGNING_KEY') ??
      this.config.get<string>('JWT_SECRET');
    if (!configured) {
      this.logger.warn(
        'REPORT_SIGNING_KEY is not set; report signatures are not trustworthy',
      );
      return 'signagewall-unsigned';
    }
    return configured;
  }

  /**
   * The address printed on the document.
   *
   * Written out in full where the installation knows its own public URL,
   * because the reader is an advertiser holding a PDF, not somebody who can
   * guess an API prefix. Falls back to the path — still correct, just less
   * convenient — rather than printing a URL that goes nowhere.
   */
  private verifyUrl(): string {
    return verifyUrl(
      this.config.get<string>('publicApiUrl'),
      this.config.get<string>('apiPrefix'),
    );
  }

  private drawVerification(
    page: PDFPage,
    parts: { digest: string; signature: string; mono: PDFFont; bold: PDFFont },
  ): void {
    const boxHeight = VERIFY_BOX;
    page.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: PAGE.width - MARGIN * 2,
      height: boxHeight,
      borderColor: rgb(0.78, 0.81, 0.85),
      borderWidth: 1,
    });

    let y = MARGIN + boxHeight - 18;
    page.drawText('VERIFICATION', {
      x: MARGIN + 12,
      y,
      size: 8,
      font: parts.bold,
      color: rgb(0.35, 0.38, 0.43),
    });
    y -= 14;
    for (const [label, value] of [
      ['sha256', parts.digest],
      ['signature', parts.signature],
    ]) {
      page.drawText(`${label}  ${value}`, {
        x: MARGIN + 12,
        y,
        size: 7,
        font: parts.mono,
        color: rgb(0.08, 0.09, 0.12),
      });
      y -= 12;
    }
    page.drawText(
      `Check at ${this.verifyUrl()} - a figure altered after issue stops matching.`,
      {
        x: MARGIN + 12,
        y,
        size: 7,
        font: parts.mono,
        color: rgb(0.35, 0.38, 0.43),
      },
    );
  }
}

/** Subset Noto Sans, read once and kept for the life of the process. */
let fontCache: { regular: Buffer; bold: Buffer } | null | undefined;

/**
 * Loads the embedded fonts, or reports that they are not there.
 *
 * `__dirname` rather than a path from the working directory: the files are
 * copied next to the compiled service by the build, and the process may be
 * started from anywhere.
 */
function loadFonts(): { regular: Buffer; bold: Buffer } | null {
  if (fontCache !== undefined) {
    return fontCache;
  }
  try {
    const dir = join(__dirname, 'fonts');
    fontCache = {
      regular: readFileSync(join(dir, 'NotoSans-Regular.ttf')),
      bold: readFileSync(join(dir, 'NotoSans-Bold.ttf')),
    };
  } catch {
    fontCache = null;
  }
  return fontCache;
}

/**
 * The verification address printed on the document.
 *
 * Exported because it is the one string on the page a reader is asked to act on,
 * and it is worth being able to check without parsing a compressed PDF stream.
 */
export function verifyUrl(base?: string, apiPrefix?: string): string {
  const prefix = (apiPrefix ?? 'api').replace(/^\/+|\/+$/g, '');
  // The API is versioned in the URI as well as prefixed — see `enableVersioning`
  // with `defaultVersion: '1'` in main.ts. Leaving the version out prints an
  // address that 404s, on the one line of the document a reader is asked to act
  // on. There is no config for the version, so it is written out here rather
  // than guessed from one.
  const path = `/${prefix}/v1/playback/verify`;
  return base ? `${base.replace(/\/+$/, '')}${path}` : path;
}

/**
 * A stable digest of what the report says.
 *
 * Built from the numbers only, in a fixed order, so it does not change when the
 * layout does — a document re-issued from the same data verifies against the
 * copy the client already has.
 */
function digestOf(report: PlaybackItemsReport): string {
  const canonical = JSON.stringify({
    from: report.from,
    to: report.to,
    totals: report.totals,
    items: [...report.items]
      .sort((a, b) => a.contentId.localeCompare(b.contentId))
      .map((item) => [
        item.contentId,
        item.plays,
        item.airtimeMs,
        item.screens,
      ]),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Keeps text inside WinAnsi, which the standard PDF fonts are limited to.
 *
 * Used for the monospace columns — digits, durations and hex, which are ASCII by
 * construction — and as the fallback for everything else when the embedded fonts
 * are unavailable. pdf-lib throws on the first character a standard font cannot
 * encode, and an export that dies on a customer's name is worse than one that
 * spells it approximately.
 */
const FOLD: Record<string, string> = {
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'dj',
  Č: 'C',
  Ć: 'C',
  Š: 'S',
  Ž: 'Z',
  Đ: 'Dj',
  '–': '-',
  '—': '-',
  '„': '"',
  '“': '"',
  '”': '"',
  '’': "'",
  '·': '-',
};

function fold(text: string): string {
  let out = '';
  for (const char of text) {
    const folded = FOLD[char];
    if (folded !== undefined) {
      out += folded;
      continue;
    }
    out += char.codePointAt(0)! < 256 ? char : '?';
  }
  return out;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function clock(hour: number): string {
  return `${String(hour % 24).padStart(2, '0')}:00`;
}

function hms(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 3600))}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
