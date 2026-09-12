import { describe, expect, it } from 'vitest';
import { MAX_PROFILES, STORE_KEY, createProgressStore, migrate, type StorageLike } from '../src/app/store';

const mem = (): StorageLike & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('progress store', () => {
  it('starts fresh from garbage and from an unknown version', () => {
    expect(migrate('nope').profiles).toEqual([]);
    expect(migrate({ v: 2, profiles: [{ id: 'sunny' }] }).profiles).toEqual([]);
    expect(migrate({ v: 1, profiles: [{ id: 'nobody' }, { id: 'sunny', books: { clock: { pages: { p1: { stars: '1' } } } } }] }).profiles).toEqual([
      { id: 'sunny', createdAt: 0, books: { clock: { pages: { p1: { stars: 1, attempts: 0, completedAt: 0 } }, opens: 0 } } },
    ]);
  });

  it('refuses a fifth profile and persists under one key', () => {
    const s = mem();
    const store = createProgressStore(s, () => 1000);
    expect(store.select('sunny')).not.toBeNull();
    expect(store.select('river')).not.toBeNull();
    expect(store.select('mochi')).not.toBeNull();
    expect(store.select('pepper')).not.toBeNull();
    expect(store.profiles()).toHaveLength(MAX_PROFILES);
    expect([...s.map.keys()]).toEqual([STORE_KEY]);
  });

  it('gives a star once per page and derives completion from the counting pages', () => {
    let t = 0;
    const store = createProgressStore(mem(), () => (t += 1));
    store.select('sunny');
    expect(store.recordPage('clock', 'p1')).toBe(true);
    expect(store.recordPage('clock', 'p1')).toBe(false);
    store.recordAttempt('clock', 'p2');
    store.recordAttempt('clock', 'p2');
    expect(store.recordPage('clock', 'p2')).toBe(true);
    expect(store.bookStars('clock')).toBe(2);
    expect(store.isBookComplete('clock', ['p1', 'p2'])).toBe(true);
    expect(store.isBookComplete('clock', ['p1', 'p2', 'p3'])).toBe(false);
    expect(store.markBookComplete('clock', ['p1', 'p2'])).toBe(true);
    expect(store.markBookComplete('clock', ['p1', 'p2'])).toBe(false);
    expect(store.active()?.books['clock']?.pages['p2']?.attempts).toBe(2);
  });

  it('keeps each child separate and survives a reload', () => {
    const s = mem();
    const a = createProgressStore(s, () => 5);
    a.select('sunny');
    a.recordPage('clock', 'p1');
    a.select('river');
    expect(a.totalStars()).toBe(0);
    const b = createProgressStore(s, () => 6);
    expect(b.active()?.id).toBe('river');
    b.setActive('sunny');
    expect(b.totalStars()).toBe(1);
  });
});
