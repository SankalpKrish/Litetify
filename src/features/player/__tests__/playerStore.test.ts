import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlayerStore } from '@/features/player/playerStore';
import type {
  PlaybackEngine,
  PlaybackState,
  PlayContext,
} from '@/playback/engine';

// Mock config module — playerStore uses config.getCached()/config.update() for persistence
const mockConfig = vi.hoisted(() => ({
  config: {
    getCached: vi.fn(() => ({
      clientId: null,
      engineType: 'websdk',
      sidebarCollapsed: false,
      sidebarWidth: 240,
      volume: 0.5,
      shuffle: false,
      repeat: 'off',
      pins: [],
      lastView: null,
    })),
    update: vi.fn().mockResolvedValue(undefined),
    init: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/config', () => mockConfig);

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    length: 0,
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    key: vi.fn(() => null),
    removeItem: vi.fn((k: string) => store.delete(k)),
    setItem: vi.fn((k: string, v: string) => store.set(k, v)),
  } satisfies Storage;
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock());
  // Reset config mock between tests
  mockConfig.config.getCached.mockReturnValue({
    clientId: null,
    engineType: 'websdk',
    sidebarCollapsed: false,
    sidebarWidth: 240,
    volume: 0.5,
    shuffle: false,
    repeat: 'off',
    pins: [],
    lastView: null,
  });
  mockConfig.config.update.mockClear();
});

function mockEngine(name = 'websdk'): PlaybackEngine {
  return {
    play: vi
      .fn<(name?: string, context?: PlayContext) => Promise<void>>()
      .mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
    setVolume: vi.fn().mockResolvedValue(undefined),
    nextTrack: vi.fn().mockResolvedValue(undefined),
    previousTrack: vi.fn().mockResolvedValue(undefined),
    toggleShuffle: vi.fn().mockResolvedValue(undefined),
    cycleRepeat: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({} as PlaybackState),
    name: vi.fn().mockReturnValue(name),
  } satisfies PlaybackEngine;
}

beforeEach(() => {
  // Reset the store to defaults before each test
  usePlayerStore.setState(usePlayerStore.getInitialState(), true);
});

describe('playerStore', () => {
  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = usePlayerStore.getState();
      expect(state.uri).toBeNull();
      expect(state.trackId).toBeNull();
      expect(state.name).toBeNull();
      expect(state.artist).toBeNull();
      expect(state.album).toBeNull();
      expect(state.albumImage).toBeNull();
      expect(state.durationMs).toBe(0);
      expect(state.positionMs).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.volume).toBe(50);
      expect(state.shuffle).toBe(false);
      expect(state.repeat).toBe('off');
      expect(state.deviceId).toBeNull();
      expect(state.engine).toBeNull();
      expect(state.engineType).toBe('websdk');
    });
  });

  describe('setState', () => {
    it('updates partial state', () => {
      usePlayerStore.getState().setState({ volume: 80, isPlaying: true });
      const state = usePlayerStore.getState();
      expect(state.volume).toBe(80);
      expect(state.isPlaying).toBe(true);
      // other fields unchanged
      expect(state.uri).toBeNull();
    });
  });

  describe('reset', () => {
    it('restores initialState after mutation', () => {
      usePlayerStore.getState().setState({ volume: 99, name: 'Changed' });
      usePlayerStore.getState().reset();

      const state = usePlayerStore.getState();
      expect(state.volume).toBe(50);
      expect(state.name).toBeNull();
      expect(state.isPlaying).toBe(false);
    });

    it('clears engine after setEngine', () => {
      const engine = mockEngine('websdk');
      usePlayerStore.getState().setEngine(engine);
      expect(usePlayerStore.getState().engine).toBe(engine);

      usePlayerStore.getState().reset();
      expect(usePlayerStore.getState().engine).toBeNull();
    });
  });

  describe('setEngine', () => {
    it('sets engine and engineType for websdk', () => {
      const engine = mockEngine('websdk');
      usePlayerStore.getState().setEngine(engine);

      const state = usePlayerStore.getState();
      expect(state.engine).toBe(engine);
      expect(state.engineType).toBe('websdk');
    });

    it('sets engineType to librespot when engine name is librespot', () => {
      const engine = mockEngine('librespot');
      usePlayerStore.getState().setEngine(engine);

      const state = usePlayerStore.getState();
      expect(state.engine).toBe(engine);
      expect(state.engineType).toBe('librespot');
    });
  });

  describe('setEngineType', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('updates engineType and persists via config', () => {
      usePlayerStore.getState().setEngineType('librespot');
      expect(usePlayerStore.getState().engineType).toBe('librespot');
      expect(mockConfig.config.update).toHaveBeenCalledWith({
        engineType: 'librespot',
      });
    });

    it('persists websdk via config', () => {
      usePlayerStore.getState().setEngineType('websdk');
      expect(usePlayerStore.getState().engineType).toBe('websdk');
      expect(mockConfig.config.update).toHaveBeenCalledWith({
        engineType: 'websdk',
      });
    });
  });

  describe('playTrack', () => {
    it('calls engine.play() when engine is set', async () => {
      const engine = mockEngine('websdk');
      usePlayerStore.getState().setEngine(engine);

      await usePlayerStore.getState().playTrack('spotify:track:abc123');

      expect(engine.play).toHaveBeenCalledWith(
        'spotify:track:abc123',
        undefined,
      );
    });

    it('passes context to engine.play()', async () => {
      const engine = mockEngine('websdk');
      usePlayerStore.getState().setEngine(engine);

      const ctx: PlayContext = { contextUri: 'spotify:playlist:xyz' };
      await usePlayerStore.getState().playTrack('spotify:track:abc', ctx);

      expect(engine.play).toHaveBeenCalledWith('spotify:track:abc', ctx);
    });

    it('is noop when engine is null', async () => {
      // engine is null by default — playTrack should not throw
      await expect(
        usePlayerStore.getState().playTrack('spotify:track:abc'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getEngine / getEngineType', () => {
    it('getEngine returns null initially', () => {
      expect(usePlayerStore.getState().getEngine()).toBeNull();
    });

    it('getEngine returns engine after setEngine', () => {
      const engine = mockEngine('websdk');
      usePlayerStore.getState().setEngine(engine);
      expect(usePlayerStore.getState().getEngine()).toBe(engine);
    });

    it('getEngineType returns websdk initially', () => {
      expect(usePlayerStore.getState().getEngineType()).toBe('websdk');
    });

    it('getEngineType returns current value', () => {
      usePlayerStore.getState().setEngineType('librespot');
      expect(usePlayerStore.getState().getEngineType()).toBe('librespot');
    });
  });
});
