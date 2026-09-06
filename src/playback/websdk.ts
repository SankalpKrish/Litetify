import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePlayerStore } from '../features/player/playerStore';
import { getStoredClientId } from '../features/auth/authStore';
import { queryClient } from '../lib/queries/queryClient';
import { playerKeys } from '../lib/queries/usePlayer';
import { log } from '../lib/debug';
import type {
  PlaybackEngine,
  PlaybackState,
  RepeatMode,
  PlayContext,
} from './engine';

declare global {
  interface Window {
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  setShuffle: (shuffle: boolean) => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  on: (event: string, cb: (data: unknown) => void) => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  _options: {
    id: string;
  };
}

interface SpotifyTrackWindow {
  current_track: {
    id: string;
    uri: string;
    name: string;
    artists: { name: string; uri: string }[];
    album: {
      name: string;
      uri: string;
      images: { url: string }[];
    };
    duration_ms: number;
  } | null;
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat_mode: number;
  track_window: SpotifyTrackWindow;
  restrictions: Record<string, boolean>;
}

function mapRepeatMode(mode: number): RepeatMode {
  if (mode === 1) return 'context';
  if (mode === 2) return 'track';
  return 'off';
}

function mapState(sdkState: SpotifyPlayerState): Partial<PlaybackState> {
  const track = sdkState.track_window.current_track;
  if (!track) {
    return {
      isPlaying: !sdkState.paused,
      positionMs: sdkState.position,
      durationMs: sdkState.duration,
      shuffle: sdkState.shuffle,
      repeat: mapRepeatMode(sdkState.repeat_mode),
    };
  }
  return {
    uri: track.uri,
    trackId: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumUri: track.album.uri,
    albumImage: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    positionMs: sdkState.position,
    isPlaying: !sdkState.paused,
    shuffle: sdkState.shuffle,
    repeat: mapRepeatMode(sdkState.repeat_mode),
  };
}

let player: SpotifyPlayer | null = null;
let ready = false;
let deviceId: string | null = null;
let unlistenFns: (() => void)[] = [];

export function getDeviceId(): string | null {
  return deviceId;
}

export function isReady(): boolean {
  return ready;
}

function updateStore(partial: Partial<PlaybackState>): void {
  usePlayerStore.getState().setState(partial);
}

async function connectToSDK(token: string): Promise<void> {
  if (typeof window.Spotify === 'undefined') {
    throw new Error('Spotify SDK not loaded');
  }

  player = new window.Spotify.Player({
    name: 'Litetify',
    getOAuthToken: (cb) => {
      invoke<string>('get_valid_token', { clientId: getStoredClientId() })
        .then(cb)
        .catch((err) => {
          console.warn(
            'Token refresh failed, using initial token (may be expired):',
            err,
          );
          cb(token);
        });
    },
    volume: usePlayerStore.getState().volume / 100,
  });

  player.on('ready', (data: unknown) => {
    const d = data as { device_id: string };
    log.sdk('READY, device_id =', d.device_id);
    deviceId = d.device_id;
    ready = true;
    updateStore({ deviceId: d.device_id });
    invoke('set_active_device', { deviceId: d.device_id }).catch(() => {});
  });

  player.on('player_state_changed', (raw: unknown) => {
    const state = raw as SpotifyPlayerState | null;
    if (state) {
      const mapped = mapState(state);
      const current = usePlayerStore.getState();
      if (mapped.uri && mapped.uri === current.uri) {
        // Same track — only update playback metadata, NOT display fields
        // (name, artist, album, albumImage). The REST API via PlayerInitializer
        // is the sole authority for display fields, and the SDK position-update
        // events should not overwrite them (which can interrupt a pending
        // crossfade or re-introduce a stale/null albumImage).
        updateStore({
          isPlaying: mapped.isPlaying,
          positionMs: mapped.positionMs,
          durationMs: mapped.durationMs,
          shuffle: mapped.shuffle,
          repeat: mapped.repeat,
        });
      } else {
        // New track: defer display fields (name, artist, album, albumImage) to
        // the REST API. The old track stays visible until the REST API returns
        // complete context-aware data — avoids placeholder icon and album flicker.
        log.sdk(
          '[SDK] new-track branch',
          `mapped.uri=${mapped.uri}`,
          `current.uri=${current.uri}`,
          `current.albumImage=${current.albumImage?.substring(0, 40) || 'null'}`,
        );
        updateStore({
          isPlaying: mapped.isPlaying,
          positionMs: mapped.positionMs,
          durationMs: mapped.durationMs,
          shuffle: mapped.shuffle,
          repeat: mapped.repeat,
        });
        queryClient.invalidateQueries({
          queryKey: playerKeys.currentlyPlaying,
        });
      }
    } else {
      // Transient null state (e.g. during track transitions). Preserve display
      // fields (name, artist, album, albumImage, uri) so the UI doesn't flash
      // to an empty state and back. The REST API poll will eventually clear
      // them if the player is truly gone.
      log.sdk('[SDK] null state — preserving display fields');
      updateStore({
        isPlaying: false,
      });
    }
  });

  player.on('not_ready', () => {
    ready = false;
    updateStore({ isPlaying: false, deviceId: null });
  });

  player.on('initialization_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK init error:', e.message);
  });

  player.on('authentication_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK auth error:', e.message);
  });

  player.on('account_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK account error:', e.message);
  });

  player.on('playback_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK playback error:', e.message);
  });

  const connected = await player.connect();
  if (!connected) {
    throw new Error('Failed to connect Spotify Player');
  }
}

let sdkPromise: Promise<void> | null = null;

export async function ensurePlayer(token: string): Promise<void> {
  if (ready && player) return;
  if (sdkPromise) return sdkPromise;

  sdkPromise = loadSDK()
    .then(async () => {
      log.sdk('script loaded, connecting\u2026');
      await connectToSDK(token);
      log.sdk('connect() returned, registering engine listeners');
      listenForEngineEvents();
    })
    .catch((err) => {
      console.error('[litetify][sdk] ensurePlayer failed:', err);
      sdkPromise = null; // allow retry
      throw err;
    });
  return sdkPromise;
}

function loadSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('spotify-player')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    const timeout = setTimeout(() => {
      reject(new Error('Spotify SDK load timeout'));
    }, 15000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Spotify SDK'));
    };

    document.head.appendChild(script);
  });
}

async function ensureReady(): Promise<SpotifyPlayer> {
  if (!player || !ready) {
    throw new Error('Player not ready');
  }
  return player;
}

function listenForEngineEvents(): void {
  unlistenFns.forEach((fn) => fn());
  unlistenFns = [];

  listen<{
    uri: string | null;
    contextUri: string | null;
    uris: string[] | null;
    offsetUri: string | null;
  }>('engine:play', (event) => {
    const { uri, contextUri, uris, offsetUri } = event.payload;
    const p = usePlayerStore.getState();
    const did = p.deviceId ?? '';
    log.sdk(
      'engine:play received, uri =',
      uri,
      'context =',
      contextUri,
      'queue =',
      uris?.length ?? 0,
      'deviceId =',
      did || '(none)',
    );
    if (!did) {
      console.warn(
        '[litetify][sdk] no device id yet — SDK not ready, play will fail',
      );
    }
    if (uri || contextUri || (uris && uris.length)) {
      const useContext = !!contextUri;
      const useQueue = !useContext && !!(uris && uris.length);
      void invoke('api_play', {
        clientId: getStoredClientId(),
        deviceId: did,
        uri: useContext || useQueue ? null : uri,
        uris: useQueue ? uris : null,
        contextUri: contextUri ?? null,
        offsetUri: useContext || useQueue ? (offsetUri ?? uri) : null,
      }).catch((e) => console.error('[litetify][sdk] api_play failed:', e));
    } else {
      void invoke('api_transfer_playback', {
        clientId: getStoredClientId(),
        deviceIds: [did],
        play: true,
      }).catch((e) =>
        console.error('[litetify][sdk] api_transfer_playback failed:', e),
      );
    }
  }).then((fn) => unlistenFns.push(fn));

  listen('engine:pause', () => {
    ensureReady().then((p) =>
      p
        .pause()
        .catch((err) => console.warn('[litetify][sdk] pause failed:', err)),
    );
  }).then((fn) => unlistenFns.push(fn));

  listen('engine:resume', () => {
    ensureReady().then((p) =>
      p
        .resume()
        .catch((err) => console.warn('[litetify][sdk] resume failed:', err)),
    );
  }).then((fn) => unlistenFns.push(fn));

  listen<number>('engine:seek', (event) => {
    ensureReady()
      .then((p) => p.seek(event.payload))
      .catch((err) => console.warn('[litetify][sdk] seek failed:', err));
  }).then((fn) => unlistenFns.push(fn));

  listen<number>('engine:set-volume', (event) => {
    ensureReady().then((p) => p.setVolume(event.payload / 100).catch(() => {}));
  }).then((fn) => unlistenFns.push(fn));

  // next/previous/shuffle/repeat go through the Web API (targeting the active
  // device) rather than the SDK methods: SDK next/previous are no-ops when a
  // single track URI was played without a context/queue, and the SDK exposes no
  // repeat control at all.
  listen('engine:next', () => {
    const did = usePlayerStore.getState().deviceId ?? '';
    if (!did) return;
    void invoke('api_next', {
      clientId: getStoredClientId(),
      deviceId: did,
    }).catch((e) => console.error('[litetify][sdk] api_next failed:', e));
  }).then((fn) => unlistenFns.push(fn));

  listen('engine:previous', () => {
    const did = usePlayerStore.getState().deviceId ?? '';
    if (!did) return;
    void invoke('api_previous', {
      clientId: getStoredClientId(),
      deviceId: did,
    }).catch((e) => console.error('[litetify][sdk] api_previous failed:', e));
  }).then((fn) => unlistenFns.push(fn));

  listen('engine:toggle-shuffle', () => {
    const p = usePlayerStore.getState();
    const did = p.deviceId ?? '';
    if (!did) return;
    const next = !p.shuffle;
    p.setState({ shuffle: next });
    void invoke('api_set_shuffle', {
      clientId: getStoredClientId(),
      deviceId: did,
      state: next,
    }).catch((e) => {
      p.setState({ shuffle: !next });
      console.error('[litetify][sdk] api_set_shuffle failed:', e);
    });
  }).then((fn) => unlistenFns.push(fn));

  listen('engine:cycle-repeat', () => {
    const p = usePlayerStore.getState();
    const did = p.deviceId ?? '';
    if (!did) return;
    const order: RepeatMode[] = ['off', 'context', 'track'];
    const next = order[(order.indexOf(p.repeat) + 1) % order.length];
    p.setState({ repeat: next });
    void invoke('api_set_repeat', {
      clientId: getStoredClientId(),
      deviceId: did,
      state: next,
    }).catch((e) => {
      p.setState({ repeat: p.repeat });
      console.error('[litetify][sdk] api_set_repeat failed:', e);
    });
  }).then((fn) => unlistenFns.push(fn));
}

export const webSdkEngine: PlaybackEngine = {
  async play(uri?: string, context?: PlayContext) {
    if (uri || context?.contextUri || context?.uris?.length) {
      await invoke('engine_play', {
        uri: uri ?? null,
        contextUri: context?.contextUri ?? null,
        uris: context?.uris ?? null,
        offsetUri: context?.offsetUri ?? uri ?? null,
      });
      return;
    }
    await invoke('engine_resume');
  },

  async pause() {
    await invoke('engine_pause');
  },

  async resume() {
    await invoke('engine_resume');
  },

  async seek(positionMs: number) {
    await invoke('engine_seek', { positionMs });
  },

  async setVolume(volume: number) {
    updateStore({ volume });
    await invoke('engine_set_volume', { volume });
  },

  async nextTrack() {
    await invoke('engine_next');
  },

  async previousTrack() {
    await invoke('engine_previous');
  },

  async toggleShuffle() {
    await invoke('engine_toggle_shuffle');
  },

  async cycleRepeat() {
    await invoke('engine_cycle_repeat');
  },

  async getState() {
    return usePlayerStore.getState() as PlaybackState;
  },

  name() {
    return 'websdk';
  },
};
