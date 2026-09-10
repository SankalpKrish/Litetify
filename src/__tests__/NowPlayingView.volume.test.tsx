import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NowPlayingView } from '../features/player/NowPlayingView';
import { usePlayerStore } from '../features/player/playerStore';
import type {
  PlaybackEngine,
  PlaybackState,
  PlayContext,
} from '../playback/engine';

function mockEngine(): PlaybackEngine {
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
    name: vi.fn().mockReturnValue('websdk'),
  } satisfies PlaybackEngine;
}

describe('NowPlayingView volume layout (issue #1)', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('renders full-width VolumeControl so the track reaches the loop button', () => {
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);
    usePlayerStore
      .getState()
      .setState({ name: 'Patlo', volume: 100, durationMs: 129000 });

    render(<NowPlayingView onNavigate={() => {}} onBack={() => {}} />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    // VolumeControl root is the slider's parent (bar -> control root).
    const controlRoot = slider.parentElement as HTMLElement;
    expect(controlRoot.style.width).toBe('100%');
  });

  it("ends the volume track at the loop button's left edge", () => {
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);
    usePlayerStore
      .getState()
      .setState({ name: 'Patlo', volume: 100, durationMs: 129000 });

    render(<NowPlayingView onNavigate={() => {}} onBack={() => {}} />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    // bar -> VolumeControl root -> volume section wrapper.
    const section = slider.parentElement?.parentElement as HTMLElement;
    // Section matches the controls row width (4x44 + 56 + 4x16 gaps = 296)
    // with a right inset of one control button (44), so the bar ends where
    // the loop button begins.
    expect(section.style.maxWidth).toBe('296px');
    expect(section.style.paddingRight).toBe('44px');
  });
});
