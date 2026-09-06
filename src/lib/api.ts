import { invoke } from '@tauri-apps/api/core';
import type {
  SpotifyUserProfile,
  SpotifyPlaylists,
  PlaylistDetail,
  PlaylistTracks,
  LikedTracks,
  SpotifyAlbum,
  SpotifyArtist,
  ArtistTopTracks,
  ArtistAlbums,
  ArtistRelatedArtists,
  SearchResult,
  Recommendations,
  CurrentlyPlaying,
  Device,
  SearchType,
  TopArtists,
  TopTracks,
  RecentlyPlayed,
  SpotifyShowPage,
  SpotifyShow,
  ShowEpisodesPage,
} from './types';
import { getStoredClientId } from '../features/auth/authStore';

function clientId(): string {
  const id = getStoredClientId();
  if (!id) return '';
  return id;
}

async function req<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  const id = clientId();
  if (!id) throw new Error('Client ID not configured');
  try {
    return await invoke<T>(cmd, { ...args, clientId: id });
  } catch (e) {
    // Tauri rejects with the raw string returned from Rust `Err(String)`.
    // Wrap it in a real Error so UI error surfaces (error.message) work.
    throw e instanceof Error
      ? e
      : new Error(typeof e === 'string' ? e : JSON.stringify(e));
  }
}

export async function apiGetMe(): Promise<SpotifyUserProfile> {
  return req<SpotifyUserProfile>('api_get_me', {});
}

export async function apiCreatePlaylist(
  name: string,
  description?: string,
  public_?: boolean,
): Promise<void> {
  return req<void>('api_create_playlist', {
    name,
    description: description ?? null,
    public: public_ ?? null,
  });
}

export async function apiGetPlaylists(
  limit?: number,
  offset?: number,
): Promise<SpotifyPlaylists> {
  return req<SpotifyPlaylists>('api_get_playlists', { limit, offset });
}

export async function apiGetPlaylist(
  playlistId: string,
  fields?: string,
): Promise<PlaylistDetail> {
  return req<PlaylistDetail>('api_get_playlist', { playlistId, fields });
}

export async function apiGetPlaylistTracks(
  playlistId: string,
  limit?: number,
  offset?: number,
): Promise<PlaylistTracks> {
  return req<PlaylistTracks>('api_get_playlist_tracks', {
    playlistId,
    limit,
    offset,
  });
}

export async function apiGetLikedTracks(
  limit?: number,
  offset?: number,
): Promise<LikedTracks> {
  return req<LikedTracks>('api_get_liked_tracks', { limit, offset });
}

export async function apiGetAlbum(albumId: string): Promise<SpotifyAlbum> {
  return req<SpotifyAlbum>('api_get_album', { albumId });
}

export async function apiGetArtist(artistId: string): Promise<SpotifyArtist> {
  return req<SpotifyArtist>('api_get_artist', { artistId });
}

export async function apiGetArtistTopTracks(
  artistId: string,
  market?: string,
): Promise<ArtistTopTracks> {
  return req<ArtistTopTracks>('api_get_artist_top_tracks', {
    artistId,
    market,
  });
}

export async function apiGetArtistAlbums(
  artistId: string,
  limit?: number,
  offset?: number,
): Promise<ArtistAlbums> {
  return req<ArtistAlbums>('api_get_artist_albums', {
    artistId,
    limit,
    offset,
  });
}

export async function apiGetRelatedArtists(
  artistId: string,
): Promise<ArtistRelatedArtists> {
  return req<ArtistRelatedArtists>('api_get_related_artists', { artistId });
}

export async function apiSearch(
  query: string,
  types: SearchType[],
  limit?: number,
  offset?: number,
  market?: string,
): Promise<SearchResult> {
  return req<SearchResult>('api_search', {
    query,
    types: types.join(','),
    limit,
    offset,
    market,
  });
}

export async function apiGetRecommendations(
  seedArtists?: string,
  seedTracks?: string,
  seedGenres?: string,
  limit?: number,
): Promise<Recommendations> {
  return req<Recommendations>('api_get_recommendations', {
    seedArtists,
    seedTracks,
    seedGenres,
    limit,
  });
}

export async function apiGetCurrentlyPlaying(): Promise<CurrentlyPlaying | null> {
  return req<CurrentlyPlaying | null>('api_get_currently_playing', {});
}

export async function apiTransferPlayback(
  deviceIds: string[],
  play?: boolean,
): Promise<void> {
  return req<void>('api_transfer_playback', { deviceIds, play });
}

export async function apiGetAvailableDevices(): Promise<Device[]> {
  return req<Device[]>('api_get_available_devices', {});
}

export async function apiAddToQueue(
  uri: string,
  deviceId?: string,
): Promise<void> {
  return req<void>('api_add_to_queue', { uri, deviceId: deviceId ?? null });
}

export async function apiSaveToLibrary(uris: string[]): Promise<void> {
  return req<void>('api_save_to_library', { uris: uris.join(',') });
}

export async function apiRemoveFromLibrary(uris: string[]): Promise<void> {
  return req<void>('api_remove_from_library', { uris: uris.join(',') });
}

export async function apiCheckLibrary(uris: string[]): Promise<boolean[]> {
  return req<boolean[]>('api_check_library', { uris: uris.join(',') });
}

export async function apiAddToPlaylist(
  playlistId: string,
  uris: string[],
): Promise<void> {
  return req<void>('api_add_to_playlist', { playlistId, uris });
}

export async function apiRemoveFromPlaylist(
  playlistId: string,
  uris: string[],
): Promise<void> {
  return req<void>('api_remove_from_playlist', { playlistId, uris });
}

export async function apiGetTopArtists(
  limit?: number,
  offset?: number,
  timeRange?: string,
): Promise<TopArtists> {
  return req<TopArtists>('api_get_top_artists', { limit, offset, timeRange });
}

export async function apiGetTopTracks(
  limit?: number,
  offset?: number,
  timeRange?: string,
): Promise<TopTracks> {
  return req<TopTracks>('api_get_top_tracks', { limit, offset, timeRange });
}

export async function apiGetRecentlyPlayed(
  limit?: number,
): Promise<RecentlyPlayed> {
  return req<RecentlyPlayed>('api_get_recently_played', { limit });
}

export async function apiCheckFollowArtist(artistId: string): Promise<boolean> {
  return req<boolean>('api_check_follow_artist', { artistId });
}

export async function apiFollowArtist(artistId: string): Promise<void> {
  return req<void>('api_follow_artist', { artistId });
}

export async function apiUnfollowArtist(artistId: string): Promise<void> {
  return req<void>('api_unfollow_artist', { artistId });
}

export async function apiFollowPlaylist(playlistId: string): Promise<void> {
  return req<void>('api_follow_playlist', { playlistId });
}

export async function apiUnfollowPlaylist(playlistId: string): Promise<void> {
  return req<void>('api_unfollow_playlist', { playlistId });
}

export async function apiGetSavedShows(
  limit?: number,
  offset?: number,
): Promise<SpotifyShowPage> {
  return req<SpotifyShowPage>('api_get_saved_shows', { limit, offset });
}

export async function apiGetShow(showId: string): Promise<SpotifyShow> {
  return req<SpotifyShow>('api_get_show', { showId });
}

export async function apiGetShowEpisodes(
  showId: string,
  limit?: number,
  offset?: number,
): Promise<ShowEpisodesPage> {
  return req<ShowEpisodesPage>('api_get_show_episodes', {
    showId,
    limit,
    offset,
  });
}
