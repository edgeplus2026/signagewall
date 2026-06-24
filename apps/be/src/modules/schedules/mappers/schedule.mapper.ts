import type {
  ResolvedWindow,
  ScheduleResolution,
} from '../schedule.evaluator';
import {
  ScheduleContentType,
  ScheduleDocument,
  ScheduleEventDocument,
  ScheduleEventType,
  ScheduleFiller,
  ScheduleFit,
  ScheduleRepeat,
} from '../schemas/schedule.schema';

export interface ScheduleContentRefResponseDto {
  contentType: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit: ScheduleFit;
}

export interface ScheduleSummaryResponseDto {
  id: string;
  name: string;
  eventCount: number;
  assignedScreenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleDetailResponseDto extends ScheduleSummaryResponseDto {
  description?: string;
  filler: ScheduleContentRefResponseDto | null;
}

export interface ScheduleEventResponseDto {
  id: string;
  type: ScheduleEventType;
  name?: string;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
  repeat: ScheduleRepeat;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  excludedDates: string[];
  order: number;
  /** True when the event's content no longer exists (deleted out-of-band). */
  contentMissing?: boolean;
}

export interface ScheduleResolutionResponseDto {
  state: 'content' | 'off' | 'filler';
  eventId?: string;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
  window?: { start: string; end: string };
}

export interface ResolvedWindowResponseDto {
  start: string;
  end: string;
  eventId: string;
  type: ScheduleEventType;
  contentType?: ScheduleContentType;
  mediaId?: string;
  playlistId?: string;
  fit?: ScheduleFit;
}

const toFillerResponse = (
  filler: ScheduleFiller | undefined,
): ScheduleContentRefResponseDto | null =>
  filler
    ? {
        contentType: filler.contentType,
        ...(filler.mediaId ? { mediaId: filler.mediaId.toString() } : {}),
        ...(filler.playlistId
          ? { playlistId: filler.playlistId.toString() }
          : {}),
        fit: filler.fit,
      }
    : null;

export const toScheduleSummaryResponse = (
  schedule: ScheduleDocument,
): ScheduleSummaryResponseDto => ({
  id: schedule._id.toString(),
  name: schedule.name,
  eventCount: schedule.eventCount,
  assignedScreenCount: schedule.screenIds.length,
  createdAt: schedule.createdAt.toISOString(),
  updatedAt: schedule.updatedAt.toISOString(),
});

export const toScheduleDetailResponse = (
  schedule: ScheduleDocument,
): ScheduleDetailResponseDto => ({
  ...toScheduleSummaryResponse(schedule),
  ...(schedule.description ? { description: schedule.description } : {}),
  filler: toFillerResponse(schedule.filler),
});

export const toScheduleEventResponse = (
  event: ScheduleEventDocument,
  contentMissing = false,
): ScheduleEventResponseDto => ({
  id: event._id.toString(),
  type: event.type,
  ...(event.name ? { name: event.name } : {}),
  ...(event.contentType ? { contentType: event.contentType } : {}),
  ...(event.mediaId ? { mediaId: event.mediaId.toString() } : {}),
  ...(event.playlistId ? { playlistId: event.playlistId.toString() } : {}),
  ...(event.fit ? { fit: event.fit } : {}),
  repeat: event.repeat,
  startDate: event.startDate,
  endDate: event.endDate,
  startTime: event.startTime,
  endTime: event.endTime,
  excludedDates: event.excludedDates ?? [],
  order: event.order,
  ...(contentMissing ? { contentMissing: true } : {}),
});

export const toScheduleEventsResponse = (
  schedule: ScheduleDocument,
  missingEventIds: Set<string> = new Set(),
): ScheduleEventResponseDto[] =>
  [...schedule.events]
    .sort((a, b) => a.order - b.order)
    .map((event) =>
      toScheduleEventResponse(event, missingEventIds.has(event._id.toString())),
    );

export const toScheduleResolutionResponse = (
  resolution: ScheduleResolution,
): ScheduleResolutionResponseDto => ({
  state: resolution.state,
  ...(resolution.eventId ? { eventId: resolution.eventId } : {}),
  ...(resolution.contentType ? { contentType: resolution.contentType } : {}),
  ...(resolution.mediaId ? { mediaId: resolution.mediaId } : {}),
  ...(resolution.playlistId ? { playlistId: resolution.playlistId } : {}),
  ...(resolution.fit ? { fit: resolution.fit } : {}),
  ...(resolution.window
    ? {
        window: {
          start: resolution.window.start.toISOString(),
          end: resolution.window.end.toISOString(),
        },
      }
    : {}),
});

export const toResolvedWindowsResponse = (
  windows: ResolvedWindow[],
): ResolvedWindowResponseDto[] =>
  windows.map((w) => ({
    start: w.start.toISOString(),
    end: w.end.toISOString(),
    eventId: w.eventId,
    type: w.type,
    ...(w.contentType ? { contentType: w.contentType } : {}),
    ...(w.mediaId ? { mediaId: w.mediaId } : {}),
    ...(w.playlistId ? { playlistId: w.playlistId } : {}),
    ...(w.fit ? { fit: w.fit } : {}),
  }));
