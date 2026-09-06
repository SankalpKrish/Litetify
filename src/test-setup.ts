import '@testing-library/jest-dom';
import { afterEach } from 'vitest';

// Mock matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock requestAnimationFrame and cancelAnimationFrame
let rafId = 0;
const rafMap = new Map<number, number>();

const _origRaf = window.requestAnimationFrame;
const _origCaf = window.cancelAnimationFrame;
void _origRaf;
void _origCaf;

window.requestAnimationFrame = (cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafMap.set(
    id,
    window.setTimeout(() => cb(performance.now()), 16),
  );
  return id;
};

window.cancelAnimationFrame = (id: number) => {
  const timer = rafMap.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    rafMap.delete(id);
  }
};

// Cleanup rAF timers after each test
afterEach(() => {
  for (const timer of rafMap.values()) {
    clearTimeout(timer);
  }
  rafMap.clear();
  rafId = 0;
});
