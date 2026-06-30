import type { AvailabilityTransition } from '../availability/availability.evaluator';
import {
  ScreenAvailability,
  ScreenAvailabilityMode,
  ScreenDocument,
  ScreenItemDocument,
  ScreenItemType,
} from '../schemas/screen.schema';

export interface WeeklyDayHoursResponseDto {
  day: string;
  enabled: boolean;
  start: string;
  end: string;
}

export interface SpecialWindowResponseDto {
  startDate: string;
  endDate: string;
  start: string;
  end: string;
}

export interface ScreenAvailabilityResponseDto {
  mode: ScreenAvailabilityMode;
  timezone: string;
  weekly: WeeklyDayHoursResponseDto[];
  special: SpecialWindowResponseDto;
}

export interface ScreenSummaryResponseDto {
  id: string;
  name: string;
  itemCount: number;
  totalDuration: number;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreenDetailResponseDto extends ScreenSummaryResponseDto {
  description?: string;
  /** When true, this screen is excluded from offline alerting. */
  alertMuted: boolean;
}

export interface ScreenStatusResponseDto {
  isOn: boolean;
  mode: ScreenAvailabilityMode;
  timezone: string;
  currentWindow?: { start: string; end: string };
  nextTransition?: { at: string; to: 'on' | 'off' };
}

export interface ScreenItemResponseDto {
  id: string;
  type: ScreenItemType;
  mediaId?: string;
  playlistId?: string;
  appInstanceId?: string;
  order: number;
  duration?: number;
  disabled?: boolean;
}

export interface ScreenDetailWithItemsResponseDto extends ScreenDetailResponseDto {
  items: ScreenItemResponseDto[];
}

export const toScreenSummaryResponse = (
  screen: ScreenDocument,
  thumbnailUrl?: string,
): ScreenSummaryResponseDto => ({
  id: screen._id.toString(),
  name: screen.name,
  itemCount: screen.itemCount,
  totalDuration: screen.totalDuration,
  ...(thumbnailUrl ? { thumbnailUrl } : {}),
  createdAt: screen.createdAt.toISOString(),
  updatedAt: screen.updatedAt.toISOString(),
});

export const toScreenAvailabilityResponse = (
  availability: ScreenAvailability,
): ScreenAvailabilityResponseDto => ({
  mode: availability.mode,
  timezone: availability.timezone,
  weekly: availability.weekly.map((entry) => ({
    day: entry.day,
    enabled: entry.enabled,
    start: entry.start,
    end: entry.end,
  })),
  special: {
    startDate: availability.special.startDate,
    endDate: availability.special.endDate,
    start: availability.special.start,
    end: availability.special.end,
  },
});

export const toScreenDetailResponse = (
  screen: ScreenDocument,
  thumbnailUrl?: string,
): ScreenDetailResponseDto => ({
  ...toScreenSummaryResponse(screen, thumbnailUrl),
  ...(screen.description ? { description: screen.description } : {}),
  alertMuted: screen.alertMuted ?? false,
});

export const toScreenStatusResponse = (
  isOn: boolean,
  mode: ScreenAvailabilityMode,
  timezone: string,
  currentWindow: { start: Date; end: Date } | undefined,
  nextTransition: AvailabilityTransition | null,
): ScreenStatusResponseDto => ({
  isOn,
  mode,
  timezone,
  ...(currentWindow
    ? {
        currentWindow: {
          start: currentWindow.start.toISOString(),
          end: currentWindow.end.toISOString(),
        },
      }
    : {}),
  ...(nextTransition
    ? {
        nextTransition: {
          at: nextTransition.at.toISOString(),
          to: nextTransition.to,
        },
      }
    : {}),
});

export const toScreenItemResponse = (
  item: ScreenItemDocument,
): ScreenItemResponseDto => ({
  id: item._id.toString(),
  type: item.type,
  ...(item.mediaId ? { mediaId: item.mediaId.toString() } : {}),
  ...(item.playlistId ? { playlistId: item.playlistId.toString() } : {}),
  ...(item.appInstanceId
    ? { appInstanceId: item.appInstanceId.toString() }
    : {}),
  order: item.order,
  ...(item.duration !== undefined ? { duration: item.duration } : {}),
  ...(item.disabled ? { disabled: true } : {}),
});

export const toScreenItemsResponse = (
  screen: ScreenDocument,
): ScreenItemResponseDto[] =>
  [...screen.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => toScreenItemResponse(item));

export const toScreenDetailWithItemsResponse = (
  screen: ScreenDocument,
  thumbnailUrl?: string,
): ScreenDetailWithItemsResponseDto => ({
  ...toScreenDetailResponse(screen, thumbnailUrl),
  items: toScreenItemsResponse(screen),
});
