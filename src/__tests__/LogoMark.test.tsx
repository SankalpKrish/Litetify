import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LogoMark } from '../components/LogoMark';

describe('LogoMark', () => {
  it('renders the Litetify mark with an accessible name', () => {
    render(<LogoMark />);
    expect(screen.getByRole('img', { name: 'Litetify' })).toBeInTheDocument();
  });

  it('hides the mark from assistive tech when decorative', () => {
    render(<LogoMark decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders the v1 logo filled spine and barbs at default size', () => {
    const { container } = render(<LogoMark />);
    expect(container.querySelector('clipPath')).toBeTruthy();
    expect(container.querySelector('circle')).toBeTruthy();
    expect(container.querySelector('path[d^="M29.68"]')).toBeTruthy();
    expect(container.querySelectorAll('g[stroke] path')).toHaveLength(5);
  });

  it('omits barbs on the solid cut', () => {
    const { container } = render(<LogoMark variant="solid" />);
    expect(container.querySelector('path[d^="M29.68"]')).toBeTruthy();
    expect(container.querySelectorAll('g[stroke] path')).toHaveLength(0);
  });
});
