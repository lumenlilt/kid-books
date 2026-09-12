import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateBook } from '../src/content/schema';
import { ACTIVITY_TYPES } from '../src/activities/registry';

const raw = JSON.parse(readFileSync(new URL('../content/books/clock.json', import.meta.url), 'utf8')) as unknown;

describe('content/books/clock.json', () => {
  it('passes the schema and every cross-reference', () => {
    const { book, errors } = validateBook(raw, ACTIVITY_TYPES);
    expect(errors).toEqual([]);
    expect(book?.pages.length).toBeGreaterThanOrEqual(6);
  });
  it('the schema catches a dangling line id', () => {
    const broken = structuredClone(raw) as { pages: Array<{ say: string[] }> };
    broken.pages[0]!.say.push('nope.missing');
    const { errors } = validateBook(broken, ACTIVITY_TYPES);
    expect(errors.some((e) => e.includes('nope.missing'))).toBe(true);
  });
  it('registry and schema agree on the activity types (both derived, not hard-coded)', () => {
    const { book } = validateBook(raw, ACTIVITY_TYPES);
    const used = new Set(book?.pages.map((p) => p.activity.type));
    for (const t of used) expect(ACTIVITY_TYPES).toContain(t);
  });
});
