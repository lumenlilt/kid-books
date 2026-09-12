import { describe, expect, it } from 'vitest';
import { angleDelta, display, dragTotal, fromTotal, hourAngle, hourAngleToMinutes, minuteAngle, sameOnFace, snapMinutes, toTotal, within } from '../src/lib/clock-math';

describe('angles', () => {
  it('hour hand: 3:00 → 90°, 3:30 → 105°, 12:00 → 0°, 15:00 → 90°', () => {
    expect(hourAngle(3, 0)).toBe(90);
    expect(hourAngle(3, 30)).toBe(105);
    expect(hourAngle(12, 0)).toBe(0);
    expect(hourAngle(15, 0)).toBe(90);
  });
  it('minute hand: 30 → 180°, 0 → 0°', () => {
    expect(minuteAngle(30)).toBe(180);
    expect(minuteAngle(0)).toBe(0);
  });
  it('angleDelta takes the short way across 0', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
  });
  it('hourAngleToMinutes inverts hourAngle', () => {
    expect(hourAngleToMinutes(hourAngle(7, 30))).toBeCloseTo(450);
  });
});

describe('totals and snapping', () => {
  it('round-trips h/m', () => {
    expect(fromTotal(toTotal({ h: 21, m: 30 }))).toEqual({ h: 21, m: 30 });
  });
  it('snaps to half hours and whole hours', () => {
    expect(snapMinutes(3 * 60 + 14, 30)).toBe(180);
    expect(snapMinutes(3 * 60 + 16, 30)).toBe(210);
    expect(snapMinutes(3 * 60 + 29, 60)).toBe(180);
    expect(snapMinutes(3 * 60 + 31, 60)).toBe(240);
  });
  it('wraps at midnight', () => {
    expect(snapMinutes(23 * 60 + 50, 60)).toBe(0);
  });
});

describe('dragging', () => {
  it('minute hand drag accumulates across 12 without jumping', () => {
    let total = toTotal({ h: 11, m: 30 });
    for (let i = 0; i < 20; i += 1) total = dragTotal(total, 10, 'minute'); // 200° ≈ 33 分鐘
    expect(fromTotal(total)).toEqual({ h: 12, m: 3 });
  });
  it('minute hand dragged a full turn advances the hour by one', () => {
    let total = toTotal({ h: 3, m: 0 });
    for (let i = 0; i < 36; i += 1) total = dragTotal(total, 10, 'minute');
    expect(fromTotal(total)).toEqual({ h: 4, m: 0 });
  });
  it('hour hand drag: 30° = one hour, backwards too', () => {
    expect(fromTotal(dragTotal(toTotal({ h: 3, m: 0 }), 30, 'hour'))).toEqual({ h: 4, m: 0 });
    expect(fromTotal(dragTotal(toTotal({ h: 0, m: 0 }), -30, 'hour'))).toEqual({ h: 23, m: 0 });
  });
  it('two full hour-hand turns is a whole day (sun and moon swap)', () => {
    let total = toTotal({ h: 9, m: 0 });
    for (let i = 0; i < 72; i += 1) total = dragTotal(total, 10, 'hour');
    expect(fromTotal(total)).toEqual({ h: 9, m: 0 });
    let half = toTotal({ h: 9, m: 0 });
    for (let i = 0; i < 36; i += 1) half = dragTotal(half, 10, 'hour');
    expect(fromTotal(half)).toEqual({ h: 21, m: 0 });
  });
});

describe('display', () => {
  it('maps 24h to the face and a period word', () => {
    expect(display(21)).toEqual({ h12: 9, period: 'night' });
    expect(display(12)).toEqual({ h12: 12, period: 'noon' });
    expect(display(0)).toEqual({ h12: 12, period: 'night' });
    expect(display(7)).toEqual({ h12: 7, period: 'morning' });
  });
  it('sameOnFace treats 3:00 and 15:00 alike', () => {
    expect(sameOnFace({ h: 3, m: 0 }, { h: 15, m: 0 })).toBe(true);
    expect(sameOnFace({ h: 3, m: 0 }, { h: 3, m: 30 })).toBe(false);
  });
  it('within tolerance across zero', () => {
    expect(within(358, 2, 5)).toBe(true);
    expect(within(350, 10, 5)).toBe(false);
  });
});
