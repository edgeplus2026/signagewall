import { createHmac, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFString,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { create as createQrMatrix } from 'qrcode';

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

/**
 * Everything the document asserts — and therefore everything the digest covers.
 *
 * One type for `render` and `digest` so the two cannot drift apart: a figure
 * added to the page without being added here is a figure the signature silently
 * stops protecting, which is the exact failure this block is meant to prevent.
 */
export interface DocumentFigures {
  organizationName: string;
  items: PlaybackItemsReport;
  coverage?: CoverageReport;
}

/** Exception lines the coverage block prints before it starts summarising. */
const MAX_EXCEPTIONS = 12;
/** Table rows the document prints; beyond this the CSV is the right tool. */
const MAX_ROWS = 300;

const MARGIN = 48;
/** Width the brand mark is drawn at; its height follows the file's ratio. */
const LOGO_WIDTH = 132;
/** Side of the verification QR, in points. */
const QR_SIZE = 76;
const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, points.
const LINE = 14;
/**
 * Height of the verification box drawn at the foot of the last page.
 *
 * Sized by the QR rather than by the text: the code is the largest thing in the
 * box, and it has to keep its quiet zone clear of the border or readers stop
 * seeing it.
 */
const VERIFY_BOX = QR_SIZE + 28;
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
  async render(
    input: DocumentFigures,
  ): Promise<{ bytes: Uint8Array; digest: string; signature: string }> {
    const digest = digestOf(input);
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

    // The brand mark leads the page rather than the customer's name. The
    // document is issued BY SignageWall about somebody's airtime, and it is
    // usually read by a third party — an advertiser, an auditor — deciding
    // whether to trust the figures, so who stands behind them belongs at the
    // top. The organization stays directly under it as the report's subject.
    const logo = loadLogo();
    if (logo) {
      const image = await pdf.embedPng(logo);
      const height = (image.height / image.width) * LOGO_WIDTH;
      y -= height;
      page.drawImage(image, { x: MARGIN, y, width: LOGO_WIDTH, height });
      y -= LINE + 8;
    } else {
      // Same reasoning as the fonts: a build that forgets to copy the asset
      // still has to produce a document, and the name set is the whole point.
      this.logger.warn('The brand logo is missing; printing the name instead');
      write('SignageWall', { font: bold, size: 16, gap: LINE + 8 });
    }

    write(input.organizationName, { font: bold, size: 14, gap: LINE });
    write(`Proof of play · ${input.items.from} – ${input.items.to}`, {
      font: regular,
      size: 11,
      gap: LINE + 10,
    });

    if (input.coverage) {
      // The day is named in the heading because coverage is only ever computed
      // for ONE day, while the document above it is titled with the whole range.
      // On a week's report an unlabelled "0%" reads as the week's figure when it
      // is the last day's — and it is the figure a client argues about.
      write(`COVERAGE · ${input.coverage.day}`, { font: bold, size: 9 });
      write(
        input.coverage.coverage === null
          ? 'No expected on-air time on this day.'
          : `${String(input.coverage.coverage)}% of expected on-air time had content, across ${String(input.coverage.totals.screens)} screens.`,
        { gap: LINE + 4 },
      );
      for (const exception of input.coverage.exceptions.slice(
        0,
        MAX_EXCEPTIONS,
      )) {
        write(
          `· ${exception.screenName}: ${exception.kind === 'off' ? 'unreachable' : `stuck on ${exception.itemName ?? '—'}`} ${clock(exception.fromHour)}–${clock(exception.toHour)}`,
          { size: 9 },
        );
      }
      // Said rather than silently dropped: a list that stops at twelve without
      // admitting it reads as "these were all of them".
      if (input.coverage.exceptions.length > MAX_EXCEPTIONS) {
        write(
          `· and ${String(input.coverage.exceptions.length - MAX_EXCEPTIONS)} more, not shown`,
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

    // A header row over nothing at all looks like an export that broke halfway.
    // Saying it plainly is the difference between "no plays" and "no report".
    if (input.items.items.length === 0) {
      write('No plays recorded in this period.', { size: 9, gap: LINE + 4 });
    }

    for (const item of input.items.items.slice(0, MAX_ROWS)) {
      if (y < FOOTER_RESERVE) {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
      }
      const cells = [
        text(truncate(item.name, 46)),
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

    if (input.items.items.length > MAX_ROWS) {
      write(
        `and ${String(input.items.items.length - MAX_ROWS)} more items, not shown`,
        { size: 9, gap: LINE + 4 },
      );
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

  /** The digest of a document's figures, for verifying without the PDF. */
  digest(input: DocumentFigures): string {
    return digestOf(input);
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
    // Only this key. An earlier version fell back to `JWT_SECRET`, which does
    // not exist in this configuration (the auth secrets are `jwt.accessSecret`
    // and `jwt.refreshSecret`) — a fallback that silently never fired. Reusing
    // an auth secret here would be worse anyway: a key that signs sessions and
    // a key that signs documents should not have to be rotated together.
    const configured = this.config.get<string>('REPORT_SIGNING_KEY');
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
  private verifyUrl(query?: { digest: string; signature: string }): string {
    return verifyUrl(
      this.config.get<string>('publicApiUrl'),
      this.config.get<string>('apiPrefix'),
      query,
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

    // Drawn first so a code that cannot be built (an address with no host, an
    // encoder that refuses the length) simply leaves the text as it was.
    drawQr(page, this.verifyUrl(parts), {
      x: PAGE.width - MARGIN - 14 - QR_SIZE,
      y: MARGIN + (boxHeight - QR_SIZE) / 2,
      size: QR_SIZE,
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
    const size = 7;
    const muted = rgb(0.35, 0.38, 0.43);
    const prefix = 'Check at ';
    const shown = this.verifyUrl();
    const target = this.verifyUrl(parts);

    // The address is drawn short and linked long. Printing the full query string
    // would run to ~200 characters, which at this size either overruns the box
    // or has to be set too small to retype - and retyping is the fallback, not
    // the path we want the reader on.
    page.drawText(prefix, {
      x: MARGIN + 12,
      y,
      size,
      font: parts.mono,
      color: muted,
    });
    const urlX = MARGIN + 12 + parts.mono.widthOfTextAtSize(prefix, size);
    const urlWidth = parts.mono.widthOfTextAtSize(shown, size);
    page.drawText(shown, {
      x: urlX,
      y,
      size,
      font: parts.mono,
      // Coloured like a link because it is one; the annotation below is
      // invisible, and nothing else on the page invites a click.
      color: rgb(0.11, 0.36, 0.72),
    });
    page.drawLine({
      start: { x: urlX, y: y - 2 },
      end: { x: urlX + urlWidth, y: y - 2 },
      thickness: 0.4,
      color: rgb(0.11, 0.36, 0.72),
    });
    linkTo(page, target, {
      x: urlX,
      y: y - 3,
      width: urlWidth,
      height: size + 4,
    });

    y -= 12;
    // Kept short enough to clear the QR: the box is one line of type wide once
    // the code takes the right-hand end of it, and text run under the code is
    // text nobody can read.
    page.drawText(
      'Click it or scan the code, or call it with the two values above.',
      { x: MARGIN + 12, y, size, font: parts.mono, color: muted },
    );
    y -= 11;
    page.drawText('A figure altered after issue stops matching.', {
      x: MARGIN + 12,
      y,
      size,
      font: parts.mono,
      color: muted,
    });
  }
}

/**
 * Makes a drawn stretch of text clickable.
 *
 * pdf-lib has no text-level link API, so the annotation is registered by hand
 * over the rectangle the text was drawn into.
 */
function linkTo(
  page: PDFPage,
  url: string,
  rect: { x: number; y: number; width: number; height: number },
): void {
  // A relative address resolves against nothing inside a PDF reader. When the
  // installation does not know its own public URL the printed path still tells a
  // reader what to call, but there is nothing to click.
  if (!/^https?:\/\//i.test(url)) {
    return;
  }
  const ref = page.doc.context.register(
    page.doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
      // No annotation border: the text is already underlined, and readers draw
      // their own hover highlight over it.
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    }),
  );
  page.node.addAnnot(ref);
}

/**
 * Draws the verification address as a QR code.
 *
 * The two hex figures stay printed above it — they are what a verifier actually
 * checks, and a code is not readable by a person. The QR is for the common case:
 * somebody holding a paper copy of the document, who would otherwise have to
 * retype 128 characters of hex to ask whether it is genuine.
 */
function drawQr(
  page: PDFPage,
  url: string,
  box: { x: number; y: number; size: number },
): void {
  const black = rgb(0.08, 0.09, 0.12);
  for (const run of qrRuns(url, box) ?? []) {
    page.drawRectangle({ ...run, color: black });
  }
}

/**
 * The QR for an address, as the filled rectangles that draw it.
 *
 * Vector runs rather than an embedded bitmap: the code stays sharp at print
 * resolution and at any zoom, and costs a few kilobytes. Runs rather than one
 * rectangle per module because a version-10 code is 3,249 cells, and drawing
 * each one separately makes the path the largest thing in the document.
 *
 * Returns null when there is nothing worth drawing, and the caller prints the
 * document without it — the code is the convenience, the hex above it is the
 * proof.
 *
 * Exported so the geometry can be checked without decoding a PDF stream.
 */
export function qrRuns(
  url: string,
  box: { x: number; y: number; size: number },
): { x: number; y: number; width: number; height: number }[] | null {
  // Nothing to scan to: with no public URL configured the printed address is a
  // path, and a QR carrying `/api/v1/...` sends the reader nowhere.
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  let matrix: { size: number; data: Uint8Array };
  try {
    // Medium correction: the code has to survive a photocopy and a phone camera
    // held at an angle, which is the whole situation it exists for.
    matrix = createQrMatrix(url, { errorCorrectionLevel: 'M' }).modules;
  } catch {
    // An address too long for any version, or an encoder that changed its mind
    // about this input. The document is still complete without the code.
    return null;
  }
  const scale = box.size / matrix.size;
  const runs: { x: number; y: number; width: number; height: number }[] = [];
  for (let row = 0; row < matrix.size; row += 1) {
    let start = -1;
    for (let column = 0; column <= matrix.size; column += 1) {
      const dark =
        column < matrix.size && matrix.data[row * matrix.size + column] === 1;
      if (dark) {
        if (start < 0) {
          start = column;
        }
        continue;
      }
      if (start >= 0) {
        runs.push({
          x: box.x + start * scale,
          // Matrix rows run top-down; PDF y counts up from the bottom of the
          // page. Getting this backwards mirrors the code, and a mirrored QR
          // is one no reader will decode.
          y: box.y + box.size - (row + 1) * scale,
          width: (column - start) * scale,
          height: scale,
        });
        start = -1;
      }
    }
  }
  return runs;
}

/** The brand mark, read once and kept for the life of the process. */
let logoCache: Buffer | null | undefined;

/**
 * Loads the logo drawn at the head of the document, or reports it is not there.
 *
 * Beside the fonts, and found the same way — a build asset copied next to the
 * compiled service, addressed from `__dirname` rather than the working
 * directory.
 */
function loadLogo(): Buffer | null {
  if (logoCache !== undefined) {
    return logoCache;
  }
  try {
    logoCache = readFileSync(
      join(__dirname, 'brand', 'signagewall-logo-horizontal.png'),
    );
  } catch {
    logoCache = null;
  }
  return logoCache;
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
export function verifyUrl(
  base?: string,
  apiPrefix?: string,
  query?: { digest: string; signature: string },
): string {
  const prefix = (apiPrefix ?? 'api').replace(/^\/+|\/+$/g, '');
  // The API is versioned in the URI as well as prefixed — see `enableVersioning`
  // with `defaultVersion: '1'` in main.ts. Leaving the version out prints an
  // address that 404s, on the one line of the document a reader is asked to act
  // on. There is no config for the version, so it is written out here rather
  // than guessed from one.
  const path = `/${prefix}/v1/playback/verify`;
  // The endpoint answers on the two values, not on the bare path: opened without
  // them it replies `valid: false`, which to the advertiser holding the document
  // looks exactly like the document failing its own check. So where we have the
  // values, they go into the address.
  const search = query
    ? `?digest=${encodeURIComponent(query.digest)}&signature=${encodeURIComponent(query.signature)}`
    : '';
  return base
    ? `${base.replace(/\/+$/, '')}${path}${search}`
    : `${path}${search}`;
}

/**
 * A stable digest of what the report says.
 *
 * Built from the figures only, in a fixed order, so it does not change when the
 * layout does — a document re-issued from the same data verifies against the
 * copy the client already has.
 *
 * EVERY claim printed on the page has to be in here, not just the table. An
 * earlier version digested `items` alone, which left the whole coverage
 * headline unprotected: the percentage, the screen count and the exception list
 * could all be edited and the signature would still check out, while the foot
 * of the document promised that an altered figure stops matching. The
 * organization name is in for the same reason — a proof-of-play document whose
 * subject can be swapped proves nothing about whose airtime it was.
 */
function digestOf(input: DocumentFigures): string {
  const canonical = JSON.stringify({
    // Versioned because the set of covered figures widened once and may again.
    // A verifier re-deriving the digest from the API has to know which rule to
    // apply, and an unlabelled change is indistinguishable from a mismatch.
    v: 2,
    organizationName: input.organizationName,
    from: input.items.from,
    to: input.items.to,
    totals: input.items.totals,
    items: [...input.items.items]
      .sort((a, b) => a.contentId.localeCompare(b.contentId))
      .map((item) => [
        item.contentId,
        item.plays,
        item.airtimeMs,
        item.screens,
      ]),
    coverage: input.coverage ? coverageFigures(input.coverage) : null,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/** The coverage claims the document makes, in an order that does not drift. */
function coverageFigures(coverage: CoverageReport): unknown {
  return {
    day: coverage.day,
    percent: coverage.coverage,
    screens: coverage.totals.screens,
    // Sorted by identity rather than kept in display order: the list is
    // presented worst-first, and two exceptions of equal duration may come back
    // either way round from a sort that is not stable across engines. A digest
    // that depends on that would fail at random.
    exceptions: [...coverage.exceptions]
      .sort(
        (a, b) =>
          a.screenId.localeCompare(b.screenId) ||
          a.fromHour - b.fromHour ||
          a.kind.localeCompare(b.kind),
      )
      .map((exception) => [
        exception.screenId,
        // The name as well as the id: the name is what the page prints, so a
        // screen renamed in the document has to stop matching.
        exception.screenName,
        exception.kind,
        exception.fromHour,
        exception.toHour,
        exception.itemName ?? null,
      ]),
  };
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

/**
 * An hour-of-day boundary as a clock time.
 *
 * `toHour` is exclusive and reaches 24 for a run that lasts to the end of the
 * day, which has to print as `24:00`. Wrapping it with `% 24` turned every
 * all-day outage into `00:00-00:00` - a zero-length interval, on the one line
 * that was supposed to say the screen was dark all day.
 */
function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function hms(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${String(Math.floor(total / 3600))}:${String(Math.floor((total % 3600) / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
