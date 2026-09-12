import { describe, expect, it } from 'vitest';
import { ndcBounds, segment, solveFitDistance } from '../src/lib/fit-rect';

describe('ndcBounds', () => {
  it('maps NDC corners to CSS pixels with y flipped', () => {
    const r = ndcBounds([{ x: -0.5, y: 0.5 }, { x: 0.5, y: -0.5 }], 1000, 500);
    expect(r).toEqual({ x: 250, y: 125, w: 500, h: 250 });
  });
  it('returns an empty rect for no points', () => {
    expect(ndcBounds([], 100, 100)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });
});

describe('solveFitDistance', () => {
  it('finds the distance where a 1/d extent hits the margin', () => {
    const extentAt = (d: number) => 3 / d; // extent 3 at d=1
    const d = solveFitDistance(extentAt, 1, 0.9);
    expect(extentAt(d)).toBeLessThanOrEqual(0.9);
    expect(extentAt(d)).toBeGreaterThan(0.85);
  });
  it('never returns below minD or above maxD', () => {
    expect(solveFitDistance(() => 100, 1, 0.9, 0.5, 5)).toBeLessThanOrEqual(5);
    expect(solveFitDistance(() => 0.01, 1, 0.9, 0.5, 5)).toBeGreaterThanOrEqual(0.5);
  });
});

describe('segment', () => {
  it('is 0 before, 1 after, linear between', () => {
    expect(segment(0.2, 0.3, 0.7)).toBe(0);
    expect(segment(0.5, 0.3, 0.7)).toBeCloseTo(0.5);
    expect(segment(0.9, 0.3, 0.7)).toBe(1);
  });
});
