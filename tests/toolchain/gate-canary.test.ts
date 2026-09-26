// DELIBERATELY FAILING. This proves a red ci-ok blocks the merge (issue #5).
// This file lives only on the throwaway canary branch and must never be merged.
import { expect, it } from 'vitest';

it('canary: CI must go red and the merge must be blocked', () => {
  expect(1 + 1).toBe(3);
});
