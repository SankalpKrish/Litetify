import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../features/player/ProgressBar';
import { usePlayerStore } from '../features/player/playerStore';

describe('ProgressBar', () => {
  beforeEach(() => {
    usePlayerStore.setState(usePlayerStore.getInitialState(), true);
  });

  it('renders with aria slider role', () => {
    render(<ProgressBar />);

    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toBeInTheDocument();
  });

  it('shows correct aria-valuenow at 0ms position', () => {
    render(<ProgressBar />);

    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '0');
  });

  it('shows correct aria-valuenow at 50% position', () => {
    usePlayerStore
      .getState()
      .setState({ durationMs: 200000, positionMs: 100000 });
    render(<ProgressBar />);

    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toHaveAttribute('aria-valuenow', '100000');
    expect(slider).toHaveAttribute('aria-valuemax', '200000');
  });

  it('shows correct aria-valuenow at 100% position', () => {
    usePlayerStore
      .getState()
      .setState({ durationMs: 200000, positionMs: 200000 });
    render(<ProgressBar />);

    const slider = screen.getByRole('slider', { name: 'Seek' });
    expect(slider).toHaveAttribute('aria-valuenow', '200000');
  });

  it('displays formatted time', () => {
    usePlayerStore
      .getState()
      .setState({ durationMs: 200000, positionMs: 65000 });
    render(<ProgressBar />);

    // 65000ms = 1:05
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('displays total duration', () => {
    usePlayerStore.getState().setState({ durationMs: 200000 });
    render(<ProgressBar />);

    // 200000ms = 3:20
    expect(screen.getByText('3:20')).toBeInTheDocument();
  });
});
