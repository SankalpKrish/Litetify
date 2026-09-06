import { useEffect } from 'react';
import { usePlayerStore } from './playerStore';
import { webSdkEngine } from '../../playback/websdk';

export function useMediaSession() {
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const unsubscribe = usePlayerStore.subscribe((state) => {
      if (state.name && state.artist) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: state.name,
          artist: state.artist,
          album: state.album ?? undefined,
          artwork: state.albumImage
            ? [{ src: state.albumImage, sizes: '640x640', type: 'image/jpeg' }]
            : [],
        });
      }
      navigator.mediaSession.playbackState = state.isPlaying
        ? 'playing'
        : 'paused';
    });

    const actions: MediaSessionAction[] = [
      'play',
      'pause',
      'previoustrack',
      'nexttrack',
      'seekforward',
      'seekbackward',
    ];
    const handlers: Partial<
      Record<MediaSessionAction, MediaSessionActionHandler>
    > = {
      play: () => {
        usePlayerStore.getState().setState({ isPlaying: true });
        webSdkEngine.resume().catch(() => {});
      },
      pause: () => {
        usePlayerStore.getState().setState({ isPlaying: false });
        webSdkEngine.pause().catch(() => {});
      },
      previoustrack: () => {
        usePlayerStore.getState().setState({ positionMs: 0 });
        webSdkEngine.previousTrack().catch(() => {});
      },
      nexttrack: () => {
        webSdkEngine.nextTrack().catch(() => {});
      },
      seekforward: () => {
        const s = usePlayerStore.getState();
        s.setState({
          positionMs: Math.min(s.durationMs, s.positionMs + 10000),
        });
      },
      seekbackward: () => {
        const s = usePlayerStore.getState();
        s.setState({ positionMs: Math.max(0, s.positionMs - 10000) });
      },
    };

    actions.forEach((a) =>
      navigator.mediaSession.setActionHandler(a, handlers[a]!),
    );

    return () => {
      unsubscribe();
      actions.forEach((a) => navigator.mediaSession.setActionHandler(a, null));
    };
  }, []);
}
