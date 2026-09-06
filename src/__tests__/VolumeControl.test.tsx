import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VolumeControl } from '../features/player/VolumeControl';
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

describe('VolumeControl', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('renders volume slider with correct attributes', () => {
    render(<VolumeControl />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows mute button', () => {
    render(<VolumeControl />);

    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
  });

  it('shows unmute button when volume is 0', () => {
    usePlayerStore.getState().setState({ volume: 0 });
    render(<VolumeControl />);

    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();
  });

  it('mute button calls engine.setVolume(0) when clicked', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    await user.click(screen.getByRole('button', { name: 'Mute' }));

    expect(engine.setVolume).toHaveBeenCalledWith(0);
    expect(usePlayerStore.getState().volume).toBe(0);
  });

  it('unmute restores previous volume after muting', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setState({ volume: 70 });
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    // First click Mute to capture current volume (70) as previous volume
    await user.click(screen.getByRole('button', { name: 'Mute' }));

    expect(engine.setVolume).toHaveBeenCalledWith(0);

    // Now click Unmute — should restore to captured volume (70)
    await user.click(screen.getByRole('button', { name: 'Unmute' }));

    expect(engine.setVolume).toHaveBeenCalledWith(70);
  });

  it('keyboard arrow up increases volume', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    slider.focus();
    await user.keyboard('{ArrowUp}');

    expect(usePlayerStore.getState().volume).toBe(55);
    expect(engine.setVolume).toHaveBeenCalledWith(55);
  });

  it('keyboard arrow down decreases volume', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    slider.focus();
    await user.keyboard('{ArrowDown}');

    expect(usePlayerStore.getState().volume).toBe(45);
    expect(engine.setVolume).toHaveBeenCalledWith(45);
  });

  it('keyboard Home sets volume to 0', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    slider.focus();
    await user.keyboard('{Home}');

    expect(usePlayerStore.getState().volume).toBe(0);
    expect(engine.setVolume).toHaveBeenCalledWith(0);
  });

  it('keyboard End sets volume to 100', async () => {
    const user = userEvent.setup();
    const engine = mockEngine();
    usePlayerStore.getState().setEngine(engine);

    render(<VolumeControl />);

    const slider = screen.getByRole('slider', { name: 'Volume' });
    slider.focus();
    await user.keyboard('{End}');

    expect(usePlayerStore.getState().volume).toBe(100);
    expect(engine.setVolume).toHaveBeenCalledWith(100);
  });
});
