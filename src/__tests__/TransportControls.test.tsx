import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransportControls } from '../features/player/TransportControls';
import { usePlayerStore } from '../features/player/playerStore';
import type {
  PlaybackEngine,
  PlaybackState,
  PlayContext,
} from '../playback/engine';

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

describe('TransportControls', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('renders play button when not playing', () => {
    render(<TransportControls />);

    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
  });

  it('renders pause button when playing', () => {
    usePlayerStore.getState().setState({ isPlaying: true });
    render(<TransportControls />);

    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
  });

  it('renders next and previous buttons', () => {
    render(<TransportControls />);

    expect(
      screen.getByRole('button', { name: 'Next track' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Previous track' }),
    ).toBeInTheDocument();
  });

  it('renders shuffle button', () => {
    render(<TransportControls />);

    expect(
      screen.getByRole('button', { name: 'Toggle shuffle' }),
    ).toBeInTheDocument();
  });

  it('renders repeat button', () => {
    render(<TransportControls />);

    expect(
      screen.getByRole('button', { name: 'Cycle repeat mode' }),
    ).toBeInTheDocument();
  });

  it('shuffle button reflects active state', () => {
    usePlayerStore.getState().setState({ shuffle: true });
    render(<TransportControls />);

    const shuffleBtn = screen.getByRole('button', { name: 'Toggle shuffle' });
    expect(shuffleBtn.className).toContain('ctrl-active');
  });

  it('next track button calls engine.nextTrack when clicked', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<TransportControls />);

    await user.click(screen.getByRole('button', { name: 'Next track' }));

    expect(engine.nextTrack).toHaveBeenCalled();
  });

  it('previous track button calls handlePrevious when clicked', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<TransportControls />);

    await user.click(screen.getByRole('button', { name: 'Previous track' }));

    // With positionMs=0 (default) and no previous press, positionMs < 3000
    // triggers engine.previousTrack()
    expect(engine.previousTrack).toHaveBeenCalled();
  });

  it('play button toggles to pause when clicked', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<TransportControls />);

    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(engine.resume).toHaveBeenCalled();
  });
});
