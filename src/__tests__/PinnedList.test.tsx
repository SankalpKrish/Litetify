import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PinnedItem } from '../features/pins/pinsStore';
import { PIN_REORDER_HOLD_MS } from '../features/pins/reorder';

const mockConfig = vi.hoisted(() => ({
  config: {
    getCached: vi.fn(() => ({ pins: [] as string[] })),
    update: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/config', () => mockConfig);

import { PinnedList } from '../app/PinnedList';
import { usePinsStore } from '../features/pins/pinsStore';

function pin(id: string, name: string): PinnedItem {
  return {
    id,
    name,
    image: '',
    uri: `spotify:playlist:${id}`,
    type: 'playlist',
  };
}

const alpha = pin('a', 'Alpha');
const beta = pin('b', 'Beta');
const gamma = pin('c', 'Gamma');

function names(): string[] {
  return usePinsStore.getState().pins.map((p) => p.name);
}

function mockStackedRects() {
  const list = screen.getByRole('list', { name: 'Pinned' });
  // Include the hidden dragged row so slot geometry matches the live list.
  list.querySelectorAll<HTMLElement>('[data-pin-uri]').forEach((el, i) => {
    const top = i * 44;
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top,
      bottom: top + 44,
      height: 44,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: top,
      toJSON() {
        return {};
      },
    });
  });
}

describe('PinnedList', () => {
  beforeEach(() => {
    mockConfig.config.update.mockClear();
    usePinsStore.setState({ pins: [alpha, beta, gamma] });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('navigates on a short click without reordering', () => {
    const onNavigate = vi.fn();
    render(<PinnedList onNavigate={onNavigate} />);

    const item = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.pointerDown(item, { pointerId: 1, button: 0, clientY: 10 });
    fireEvent.pointerUp(item, { pointerId: 1, button: 0, clientY: 10 });
    fireEvent.click(item);

    expect(onNavigate).toHaveBeenCalledWith('playlist', { id: 'a' });
    expect(names()).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('does not navigate after a hold that starts a reorder', () => {
    const onNavigate = vi.fn();
    render(<PinnedList onNavigate={onNavigate} />);

    const item = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.pointerDown(item, { pointerId: 1, button: 0, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(PIN_REORDER_HOLD_MS);
    });
    expect(item).toHaveAttribute('aria-grabbed', 'true');

    fireEvent.pointerUp(item, { pointerId: 1, button: 0, clientY: 10 });
    fireEvent.click(item);

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('reorders on click-and-hold then drag', () => {
    render(<PinnedList onNavigate={vi.fn()} />);

    const item = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.pointerDown(item, {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 20,
    });
    act(() => {
      vi.advanceTimersByTime(PIN_REORDER_HOLD_MS);
    });
    mockStackedRects();

    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 10,
      clientY: 120,
    });
    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 10,
      clientY: 120,
    });

    expect(names()).toEqual(['Beta', 'Gamma', 'Alpha']);
  });

  it('drops after the pin the cursor is over, not past it', () => {
    render(<PinnedList onNavigate={vi.fn()} />);

    const item = screen.getByRole('button', { name: 'Alpha' });
    fireEvent.pointerDown(item, {
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 20,
    });
    act(() => {
      vi.advanceTimersByTime(PIN_REORDER_HOLD_MS);
    });
    mockStackedRects();

    // Beta occupies 44–88 (mid 66). Cursor at 70 should insert after Beta.
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 10,
      clientY: 70,
    });
    fireEvent.pointerUp(document, {
      pointerId: 1,
      clientX: 10,
      clientY: 70,
    });

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma']);
  });

  it('moves a focused pin with Alt+ArrowDown', () => {
    render(<PinnedList onNavigate={vi.fn()} />);

    const item = screen.getByRole('button', { name: 'Alpha' });
    item.focus();
    fireEvent.keyDown(item, { key: 'ArrowDown', altKey: true });

    expect(names()).toEqual(['Beta', 'Alpha', 'Gamma']);
  });
});
