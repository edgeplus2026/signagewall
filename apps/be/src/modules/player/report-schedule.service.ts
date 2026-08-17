import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { SchedulerLockService } from '../../common/redis/scheduler-lock.service';
import { MailService } from '../mail/mail.service';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { PlaybackPdfService } from './playback-pdf.service';
import { PlaybackReportService } from './playback-report.service';
import {
  ReportFrequency,
  ReportSchedule,
  ReportScheduleDocument,
} from './schemas/report-schedule.schema';

/**
 * Sends the proof-of-play report on a standing schedule.
 *
 * The reason to build this rather than leave it to whoever remembers to export:
 * an empty report is invisible. A screen that stopped reporting three weeks ago
 * looks exactly like a screen nobody has asked about, and the moment somebody
 * asks is usually the moment a client has already noticed. Putting the coverage
 * number in an inbox every week means the silence gets found by us.
 */

/** How often the scheduler wakes. The hour check inside does the real work. */
const TICK_MS = 15 * 60 * 1000;
const LOCK_TTL_MS = 5 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Local hour the report goes out.
 *
 * Fixed rather than configurable: the only thing the choice ever decided was
 * which part of somebody's day the mail landed in, and every extra field on a
 * settings card is one more thing an operator has to have an opinion about.
 * Mid-afternoon is deliberate — the previous day is long closed, and a report
 * that arrives then still leaves the working day to act on what it says.
 */
const SEND_HOUR = 15;

@Injectable()
export class ReportScheduleService {
  private readonly logger = new Logger(ReportScheduleService.name);

  constructor(
    @InjectModel(ReportSchedule.name)
    private readonly model: Model<ReportScheduleDocument>,
    private readonly reports: PlaybackReportService,
    private readonly pdf: PlaybackPdfService,
    private readonly mail: MailService,
    private readonly organizations: OrganizationsRepository,
    private readonly lock: SchedulerLockService,
  ) {}

  get(organizationId: string): Promise<ReportScheduleDocument | null> {
    return this.model
      .findOne({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  save(
    organizationId: string,
    data: Partial<ReportSchedule>,
  ): Promise<ReportScheduleDocument | null> {
    return this.model
      .findOneAndUpdate(
        { organizationId: new Types.ObjectId(organizationId) },
        { $set: data },
        { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  /**
   * Sends whatever is due.
   *
   * Runs on a coarse tick and decides per schedule, rather than one cron per
   * organization: a fleet's worth of cron registrations is a lot of moving parts
   * for a job whose entire question is "is it past 07:00 where this customer
   * is". Guarded by the shared lease so several backend instances do not each
   * send the same report.
   */
  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (!(await this.lock.isLeader('playback-report-schedule', LOCK_TTL_MS))) {
      return;
    }

    const schedules = await this.model.find({ enabled: true }).exec();
    for (const schedule of schedules) {
      try {
        await this.runOne(schedule);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Scheduled playback report failed for ${schedule.organizationId.toString()}: ${message}`,
        );
        // Recorded on the schedule, not only in the log: the operator who
        // configured this is the one who needs to know it stopped working, and
        // they will never read the server log.
        await this.model
          .updateOne({ _id: schedule._id }, { $set: { lastError: message } })
          .exec();
      }
    }
  }

  /** Sends one schedule's report, if a period has closed since the last send. */
  private async runOne(schedule: ReportScheduleDocument): Promise<void> {
    if (schedule.recipients.length === 0) {
      return;
    }

    const local = localParts(new Date(), schedule.timezone);
    if (local.hour < SEND_HOUR) {
      return;
    }

    const period = periodFor(schedule.frequency, local.day);
    if (!period || schedule.lastSentPeriod === period.key) {
      return;
    }

    const organizationId = schedule.organizationId.toString();
    const [items, coverage, organization] = await Promise.all([
      this.reports.items(organizationId, period.from, period.to),
      this.reports.coverage(organizationId, period.to),
      this.organizations.findById(organizationId),
    ]);

    const { bytes } = await this.pdf.render({
      organizationName: organization?.name ?? 'SignageWall',
      items,
      coverage,
    });

    const subject = `Proof of play · ${period.from} – ${period.to}`;
    const html = renderSummary({
      organizationName: organization?.name ?? 'SignageWall',
      from: period.from,
      to: period.to,
      coveragePercent: coverage.coverage,
      screens: coverage.totals.screens,
      plays: items.totals.plays,
      airtimeMs: items.totals.airtimeMs,
      exceptions: coverage.exceptions.slice(0, 8).map((exception) => ({
        screenName: exception.screenName,
        text:
          exception.kind === 'off'
            ? `unreachable ${clock(exception.fromHour)}–${clock(exception.toHour)}`
            : `stuck on ${exception.itemName ?? '—'} ${clock(exception.fromHour)}–${clock(exception.toHour)}`,
      })),
    });

    // Claimed BEFORE sending, and only by the instance whose update matched the
    // previous period: two instances that both got past the lease still cannot
    // send the same report twice.
    const claimed = await this.model
      .updateOne(
        {
          _id: schedule._id,
          lastSentPeriod: schedule.lastSentPeriod ?? { $exists: false },
        },
        {
          $set: { lastSentPeriod: period.key, lastSentAt: new Date() },
          $unset: { lastError: '' },
        },
      )
      .exec();
    if (claimed.modifiedCount === 0) {
      return;
    }

    // Each address is delivered independently: the period has already been
    // claimed, so letting one dead mailbox throw would take the rest of the
    // list down with it and there would be no second attempt.
    const failures: string[] = [];
    for (const recipient of schedule.recipients) {
      try {
        await this.mail.sendPlaybackReportEmail({
          to: recipient,
          subject,
          html,
          attachments: [
            {
              filename: `playback-${period.from}_${period.to}.pdf`,
              content: Buffer.from(bytes),
            },
          ],
        });
      } catch (error) {
        failures.push(recipient);
        this.logger.warn(
          `Playback report to ${recipient} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (failures.length > 0) {
      await this.model
        .updateOne(
          { _id: schedule._id },
          {
            $set: {
              lastError: `Could not deliver to ${failures.join(', ')}`,
            },
          },
        )
        .exec();
    }

    this.logger.log(
      `Sent ${schedule.frequency} playback report ${period.key} to ${String(schedule.recipients.length)} recipient(s)`,
    );
  }
}

/** The closed period a report should cover, given today's local date. */
export function periodFor(
  frequency: ReportFrequency,
  today: string,
): { key: string; from: string; to: string } | null {
  const todayMs = Date.parse(`${today}T00:00:00.000Z`);
  if (Number.isNaN(todayMs)) {
    return null;
  }

  if (frequency === ReportFrequency.DAILY) {
    const yesterday = isoDay(todayMs - MS_PER_DAY);
    return { key: yesterday, from: yesterday, to: yesterday };
  }

  if (frequency === ReportFrequency.WEEKLY) {
    // Reports cover the week that has ENDED. A "this week so far" report invites
    // comparing a Tuesday against a full week and concluding something is wrong.
    const weekday = (new Date(todayMs).getUTCDay() + 6) % 7; // Monday = 0.
    const thisMonday = todayMs - weekday * MS_PER_DAY;
    const from = isoDay(thisMonday - 7 * MS_PER_DAY);
    const to = isoDay(thisMonday - MS_PER_DAY);
    return { key: from, from, to };
  }

  const first = new Date(todayMs);
  first.setUTCDate(1);
  const lastOfPrevious = first.getTime() - MS_PER_DAY;
  const previous = new Date(lastOfPrevious);
  previous.setUTCDate(1);
  const from = isoDay(previous.getTime());
  return { key: from.slice(0, 7), from, to: isoDay(lastOfPrevious) };
}

function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Local day and hour in a timezone, without pulling in a date library. */
export function localParts(
  at: Date,
  timeZone: string,
): { day: string; hour: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(at);
    const get = (type: string): string =>
      parts.find((part) => part.type === type)?.value ?? '';
    return {
      day: `${get('year')}-${get('month')}-${get('day')}`,
      // 24 is a legal answer from some locales for midnight.
      hour: Number(get('hour')) % 24,
    };
  } catch {
    // An invalid timezone must not stop every other customer's report.
    return { day: at.toISOString().slice(0, 10), hour: at.getUTCHours() };
  }
}

function clock(hour: number): string {
  return `${String(hour % 24).padStart(2, '0')}:00`;
}

/**
 * The email body.
 *
 * A summary, not the report: the PDF is attached and is the document. What the
 * body has to do is make the one number visible without opening anything, so a
 * bad week is noticed on a phone.
 */
function renderSummary(context: {
  organizationName: string;
  from: string;
  to: string;
  coveragePercent: number | null;
  screens: number;
  plays: number;
  airtimeMs: number;
  exceptions: { screenName: string; text: string }[];
}): string {
  const hours = Math.round(context.airtimeMs / 360_000) / 10;
  const coverage =
    context.coveragePercent === null
      ? '—'
      : `${String(context.coveragePercent)}%`;

  const exceptions =
    context.exceptions.length === 0
      ? '<li style="color:#57606E">Everything ran as planned.</li>'
      : context.exceptions
          .map(
            (exception) =>
              `<li><strong>${escapeHtml(exception.screenName)}</strong> — ${escapeHtml(exception.text)}</li>`,
          )
          .join('');

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#131820;line-height:1.6">
      <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#57606E">
        ${escapeHtml(context.organizationName)}
      </p>
      <h1 style="margin:0 0 16px;font-size:20px">Proof of play · ${context.from} – ${context.to}</h1>
      <p style="margin:0 0 8px;font-size:32px;font-weight:600">${coverage}</p>
      <p style="margin:0 0 20px;color:#57606E">
        of expected on-air time had content, across ${String(context.screens)} screens.<br>
        ${context.plays.toLocaleString('en-US')} plays · ${String(hours)} h measured airtime.
      </p>
      <ul style="margin:0 0 20px;padding-left:18px">${exceptions}</ul>
      <p style="margin:0;color:#57606E;font-size:13px">
        The signed PDF is attached. Daily detail is kept for 90 days.
      </p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
