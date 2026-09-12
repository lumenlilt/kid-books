import { describe, expect, it } from 'vitest';
import { palettes } from '../src/scene/palette';

describe('palettes', () => {
  it('every palette carries the full set of roles', () => {
    for (const [name, p] of Object.entries(palettes)) {
      expect(p.name).toBe(name);
      for (const key of ['sky', 'wall', 'floor', 'wood', 'accent', 'paper', 'ink'] as const) {
        expect(p[key]).toBeGreaterThanOrEqual(0);
        expect(p[key]).toBeLessThanOrEqual(0xffffff);
      }
    }
  });
});
