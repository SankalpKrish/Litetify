import { describe, it, expect } from 'vitest';

// Phase 0 smoke test so the test pipeline has a green baseline.
// Real unit tests (PKCE, API retry, manifest validation) arrive with their
// phases per plan.md.
describe('phase 0 baseline', () => {
  it('runs the test pipeline', () => {
    expect(1 + 1).toBe(2);
  });
});
