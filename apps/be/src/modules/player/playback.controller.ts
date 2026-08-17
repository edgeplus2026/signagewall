import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { RequiredOrganizationId } from '../../common/decorators/current-organization.decorator';
import { RequireOrgRole } from '../../common/decorators/org-roles.decorator';
import { OrgMembershipGuard } from '../../common/guards/org-membership.guard';
import {
  ApiCommonErrorResponses,
  ApiOrgScoped,
  ApiSuccessResponse,
} from '../../common/swagger';
import {
  CoverageQueryDto,
  DaypartingQueryDto,
  PlanQueryDto,
  PlaybackItemsQueryDto,
} from './dto/playback-query.dto';
import { ReportScheduleDto } from './dto/report-schedule.dto';
import { PlaybackPdfService } from './playback-pdf.service';
import { ReportScheduleService } from './report-schedule.service';
import {
  PlaybackItemRow,
  PlaybackReportService,
} from './playback-report.service';
import { OrganizationsRepository } from '../organizations/organizations.repository';

/**
 * Proof of play, as an operator reads it.
 *
 * Read-only and organization-scoped. Devices never touch this — they deliver
 * over the socket; this is the other end, where the numbers become a document
 * somebody sends to a client.
 */
@ApiTags('playback')
@ApiOrgScoped()
@ApiCommonErrorResponses()
@Controller('playback')
@UseGuards(OrgMembershipGuard)
export class PlaybackController {
  constructor(
    private readonly reports: PlaybackReportService,
    private readonly pdf: PlaybackPdfService,
    private readonly organizations: OrganizationsRepository,
    private readonly schedule: ReportScheduleService,
  ) {}

  /** The standing instruction to email this report, if there is one. */
  @Get('schedule')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  async getSchedule(@RequiredOrganizationId() organizationId: string) {
    const schedule = await this.schedule.get(organizationId);
    return {
      enabled: schedule?.enabled ?? false,
      frequency: schedule?.frequency ?? 'weekly',
      recipients: schedule?.recipients ?? [],
      hour: schedule?.hour ?? 7,
      timezone: schedule?.timezone ?? 'Europe/Belgrade',
      lastSentAt: schedule?.lastSentAt?.toISOString(),
      lastError: schedule?.lastError,
    };
  }

  @Put('schedule')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  async setSchedule(
    @RequiredOrganizationId() organizationId: string,
    @Body() dto: ReportScheduleDto,
  ) {
    const saved = await this.schedule.save(organizationId, dto);
    return {
      enabled: saved?.enabled ?? false,
      frequency: saved?.frequency ?? 'weekly',
      recipients: saved?.recipients ?? [],
      hour: saved?.hour ?? 7,
      timezone: saved?.timezone ?? 'Europe/Belgrade',
    };
  }

  /** The coverage matrix for one day: a row per screen, a cell per hour. */
  @Get('coverage')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  coverage(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: CoverageQueryDto,
  ) {
    return this.reports.coverage(organizationId, query.day, {
      ...(query.contentId ? { contentId: query.contentId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
    });
  }

  /**
   * Plays and airtime by hour of day.
   *
   * The question a client starts asking the moment they pay by time slot: "how
   * many times did my spot run between noon and two". The data has been
   * collected since the first release precisely so this could be answered
   * afterwards — a screen cannot be asked later what it did last Tuesday.
   */
  @Get('dayparting')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  dayparting(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: DaypartingQueryDto,
  ) {
    return this.reports.dayparting(organizationId, query.from, query.to, {
      ...(query.contentId ? { contentId: query.contentId } : {}),
      ...(query.campaignId ? { campaignId: query.campaignId } : {}),
      ...(query.screenIds ? { screenIds: query.screenIds } : {}),
    });
  }

  /** Planned against played, per item — where the two disagree, and by how much. */
  @Get('plan')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  plan(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: PlanQueryDto,
  ) {
    return this.reports.plan(organizationId, query.day);
  }

  /** Totals per content item over a range — the table, and the deliverable. */
  @Get('items')
  @RequireOrgRole()
  @ApiSuccessResponse(Object)
  items(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: PlaybackItemsQueryDto,
  ) {
    return this.reports.items(
      organizationId,
      query.from,
      query.to,
      query.screenIds,
      query.groupBy === 'campaign',
    );
  }

  /**
   * The same table as a file.
   *
   * This is also the archive: daily detail is deleted after ninety days, so an
   * operator who exports at the end of a campaign keeps a copy that outlives the
   * retention window. Written straight to the response so it arrives as a file
   * rather than as JSON wrapped by the global response envelope.
   */
  @Get('items.csv')
  @RequireOrgRole()
  async itemsCsv(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: PlaybackItemsQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const report = await this.reports.items(
      organizationId,
      query.from,
      query.to,
      query.screenIds,
    );

    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="playback-${query.from}_${query.to}.csv"`,
    );
    response.send(toCsv(report.items));
  }

  /**
   * The report as a document, with a verification block.
   *
   * The CSV is what an operator works with; this is what they send. It carries a
   * digest of the numbers and a signature over it, so a figure edited after the
   * fact — in the document or in the data — stops matching.
   */
  @Get('report.pdf')
  @RequireOrgRole()
  async reportPdf(
    @RequiredOrganizationId() organizationId: string,
    @Query() query: PlaybackItemsQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const [items, coverage, organization] = await Promise.all([
      this.reports.items(
        organizationId,
        query.from,
        query.to,
        query.screenIds,
        true,
      ),
      // The coverage headline belongs to a single day; on a range the document
      // carries the last day's, which is the one an operator is asking about
      // when they export at the end of a campaign.
      this.reports.coverage(organizationId, query.to),
      this.organizations.findById(organizationId),
    ]);

    const { bytes } = await this.pdf.render({
      organizationName: organization?.name ?? 'SignageWall',
      items,
      coverage,
    });

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="playback-${query.from}_${query.to}.pdf"`,
    );
    response.send(Buffer.from(bytes));
  }
}

/**
 * Byte-order mark, written as an escape so it is visible in the source.
 *
 * Excel is the most likely thing to open this file, and without a BOM it reads
 * UTF-8 as the system codepage — turning every accented screen name into
 * mojibake in the document a client receives.
 */
const BOM = '\uFEFF';

const COLUMNS = [
  'content_id',
  'name',
  'kind',
  'plays',
  'airtime_ms',
  'airtime_hms',
  'share_percent',
  'screens',
  'screen_names',
  'first_at',
  'last_at',
] as const;

/**
 * The rows as CSV.
 *
 * A UTF-8 BOM leads the file because the single most likely thing to happen to
 * it is being opened in Excel, which without one reads UTF-8 as the system
 * codepage and turns every accented screen name into mojibake. Airtime is given
 * twice — raw milliseconds for anything that recalculates, and h:mm:ss for the
 * person reading the column.
 */
function toCsv(items: PlaybackItemRow[]): string {
  const lines = [COLUMNS.join(',')];
  for (const item of items) {
    lines.push(
      [
        item.contentId,
        item.name,
        item.kind ?? '',
        item.plays,
        item.airtimeMs,
        hms(item.airtimeMs),
        item.share,
        item.screens,
        item.screenNames.join('; '),
        item.firstAt ?? '',
        item.lastAt ?? '',
      ]
        .map(escape)
        .join(','),
    );
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/**
 * One CSV field.
 *
 * Anything starting with a formula character is prefixed with a quote: a screen
 * named `=cmd` would otherwise be executed as a formula by the spreadsheet that
 * opens it, and the content of these fields is operator-supplied.
 */
function escape(value: string | number): string {
  const text = String(value);
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(guarded)
    ? `"${guarded.replaceAll('"', '""')}"`
    : guarded;
}

/** Milliseconds as h:mm:ss, for the column a person reads. */
function hms(ms: number): string {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours)}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
