import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '../lib/ErrorBoundary';

// A component that renders normally
function GoodChild() {
  return <div>Working content</div>;
}

// Suppress console.error from React error boundary during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Working content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ErrorThrower />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' }),
    ).toBeInTheDocument();
  });

  it('reset button re-renders children after fixing the error', () => {
    let isBroken = true;

    function ConditionalChild() {
      if (isBroken) {
        throw new Error('Test error message');
      }
      return <div>Working content</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Fix the error condition BEFORE clicking Try Again
    isBroken = false;

    // Click the reset button — ErrorBoundary resets state and re-renders children
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Working content')).toBeInTheDocument();
  });
});

function ErrorThrower(): ReactNode {
  throw new Error('Test error message');
}
