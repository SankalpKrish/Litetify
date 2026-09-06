import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ensurePlayer, webSdkEngine } from '../../playback/websdk';
import { usePlayerStore } from './playerStore';
import { getStoredClientId } from '../auth/authStore';
import { setPlaybackEngine, setStateChangeCallbacks } from '../../mods/api';
import { emitEvent } from '../../mods/api';
import { useMediaSession } from './useMediaSession';
import { useCurrentlyPlaying } from '../../lib/queries/usePlayer';
import { log } from '../../lib/debug';

export function PlayerInitializer() {
  const initialized = useRef(false);
  const setState = usePlayerStore((s) => s.setState);
  const setEngine = usePlayerStore((s) => s.setEngine);

  useMediaSession();

  const { data: cp } = useCurrentlyPlaying();

  useEffect(() => {
    if (!cp?.item) {
      log.init('[PlayerInitializer] cp?.item is falsy, skipping. cp =', cp);
      return;
    }
    const current = usePlayerStore.getState();
    const newImage =
      cp.item.uri && cp.item.uri === current.uri && current.albumImage !== null
        ? current.albumImage
        : (cp.item.album?.images?.[0]?.url ?? null);
    log.init(
      '[PlayerInitializer] albumImage',
      `uriMatch=${cp.item.uri === current.uri}`,
      `hadPrev=${current.albumImage !== null}`,
      `newImage=${newImage?.substring(0, 60) || 'null'}`,
      `imagesLen=${cp.item.album?.images?.length ?? 0}`,
    );
    setState({
      name: cp.item.name ?? null,
      uri: cp.item.uri ?? null,
      durationMs: cp.item.duration_ms ?? 0,
      positionMs: cp.progress_ms ?? 0,
      isPlaying: cp.is_playing ?? false,
      artist: cp.item.artists?.map((a) => a.name).join(', ') ?? null,
      album: cp.item.album?.name ?? null,
      albumUri: cp.item.album?.uri ?? null,
      albumImage: newImage,
    });
  }, [cp, setState]);

  useEffect(() => {
    // `initialized` guards against React 18 StrictMode's double-invocation in dev.
    // We intentionally do NOT abort on cleanup: the StrictMode unmount/remount would
    // otherwise cancel the in-flight token fetch and leave the player uninitialized.
    if (initialized.current) return;
    initialized.current = true;

    const engine = webSdkEngine;
    const clientId = getStoredClientId();
    log.init('PlayerInitializer running. clientId set =', !!clientId);

    setEngine(engine);
    setPlaybackEngine(engine);

    setStateChangeCallbacks([
      (state) => emitEvent('playback:stateChange', state),
    ]);

    log.init('websdk path -- fetching token then ensurePlayer');
    invoke<string>('get_valid_token', { clientId })
      .then((token) => {
        log.init('token acquired, calling ensurePlayer');
        return ensurePlayer(token);
      })
      .catch((err) => console.error('Player init failed:', err));
  }, [setState, setEngine]);

  return null;
}
