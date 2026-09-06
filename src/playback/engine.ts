export type RepeatMode = 'off' | 'context' | 'track';

export interface PlaybackState {
  uri: string | null;
  trackId: string | null;
  name: string | null;
  artist: string | null;
  album: string | null;
  albumUri: string | null;
  albumImage: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  deviceId: string | null;
}

/** Optional playback context so next/previous have a queue to traverse. */
export interface PlayContext {
  /** Spotify context URI, e.g. a playlist or album: spotify:playlist:... */
  contextUri?: string;
  /** Explicit queue of track URIs when there is no Spotify context
   *  (e.g. search results, Liked Songs). */
  uris?: string[];
  /** Track URI to start at within the context/queue (sets the offset). */
  offsetUri?: string;
}

export interface PlaybackEngine {
  play(uri?: string, context?: PlayContext): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  toggleShuffle(): Promise<void>;
  cycleRepeat(): Promise<void>;
  getState(): Promise<PlaybackState>;
  name(): string;
}
