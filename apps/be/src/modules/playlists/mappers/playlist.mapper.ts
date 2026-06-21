import {
  PlaylistDocument,
  PlaylistItemDocument,
} from '../schemas/playlist.schema';

export interface PlaylistSummaryResponseDto {
  id: string;
  name: string;
  itemCount: number;
  thumbnailUrl?: string;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistDetailResponseDto extends PlaylistSummaryResponseDto {
  description?: string;
}

export interface PlaylistItemResponseDto {
  id: string;
  mediaId: string;
  order: number;
  duration: number;
  disabled?: boolean;
}

export interface PlaylistDetailWithItemsResponseDto extends PlaylistDetailResponseDto {
  items: PlaylistItemResponseDto[];
}

export const toPlaylistSummaryResponse = (
  playlist: PlaylistDocument,
  thumbnailUrl?: string,
): PlaylistSummaryResponseDto => ({
  id: playlist._id.toString(),
  name: playlist.name,
  itemCount: playlist.itemCount,
  totalDuration: playlist.totalDuration,
  ...(thumbnailUrl ? { thumbnailUrl } : {}),
  createdAt: playlist.createdAt.toISOString(),
  updatedAt: playlist.updatedAt.toISOString(),
});

export const toPlaylistDetailResponse = (
  playlist: PlaylistDocument,
  thumbnailUrl?: string,
): PlaylistDetailResponseDto => ({
  ...toPlaylistSummaryResponse(playlist, thumbnailUrl),
  ...(playlist.description ? { description: playlist.description } : {}),
});

export const toPlaylistItemResponse = (
  item: PlaylistItemDocument,
): PlaylistItemResponseDto => ({
  id: item._id.toString(),
  mediaId: item.mediaId.toString(),
  order: item.order,
  duration: item.duration,
  ...(item.disabled ? { disabled: true } : {}),
});

export const toPlaylistItemsResponse = (
  playlist: PlaylistDocument,
): PlaylistItemResponseDto[] =>
  [...playlist.items]
    .sort((a, b) => a.order - b.order)
    .map((item) => toPlaylistItemResponse(item));

export const toPlaylistDetailWithItemsResponse = (
  playlist: PlaylistDocument,
  thumbnailUrl?: string,
): PlaylistDetailWithItemsResponseDto => ({
  ...toPlaylistDetailResponse(playlist, thumbnailUrl),
  items: toPlaylistItemsResponse(playlist),
});
