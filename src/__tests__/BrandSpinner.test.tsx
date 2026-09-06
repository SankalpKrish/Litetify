import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrandSpinner } from '../components/BrandSpinner';

describe('BrandSpinner', () => {
  it('exposes a loading status', () => {
    render(<BrandSpinner />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('uses the supplied status label', () => {
    render(<BrandSpinner label="Checking authentication..." />);
    expect(
      screen.getByRole('status', { name: 'Checking authentication...' }),
    ).toBeInTheDocument();
  });
});
