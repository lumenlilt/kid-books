import { describe, expect, it } from 'vitest';
import { RESTING_STATES, USER_EVENTS, createBookFsm, isTransient, next, transitions, type BookEvent, type BookState } from '../src/app/book-fsm';

const STATES = Object.keys(transitions) as BookState[];
const EVENTS: BookEvent[] = ['TAP', 'ARRIVED', 'OPENED', 'CLOSE', 'CLOSED', 'RETURNED'];

describe('book fsm', () => {
  it('every transient state has exactly one exit event and it is not a user event', () => {
    for (const s of STATES.filter(isTransient)) {
      const exits = Object.keys(transitions[s]) as BookEvent[];
      expect(exits, s).toHaveLength(1);
      expect(USER_EVENTS, `${s} exits via ${exits[0]}`).not.toContain(exits[0]);
    }
  });

  it('transient states ignore user input', () => {
    for (const s of STATES.filter(isTransient)) for (const e of USER_EVENTS) expect(next(s, e), `${s}+${e}`).toBeNull();
  });

  it('resting states only respond to user events', () => {
    for (const s of RESTING_STATES) {
      for (const e of EVENTS) {
        const to = next(s, e);
        if (USER_EVENTS.includes(e)) expect(to === null || typeof to === 'string').toBe(true);
        else expect(to, `${s}+${e}`).toBeNull();
      }
    }
  });

  it('walks the full open/close cycle back to the shelf', () => {
    const fsm = createBookFsm();
    const path: BookState[] = [];
    for (const e of ['TAP', 'ARRIVED', 'ARRIVED', 'OPENED', 'CLOSE', 'CLOSED', 'RETURNED'] as BookEvent[]) {
      expect(fsm.send(e)).toBe(true);
      path.push(fsm.state);
    }
    expect(path).toEqual(['sliding-out', 'flying', 'opening', 'reading', 'closing', 'returning', 'on-shelf']);
  });

  it('a second TAP while flying is ignored and does not fire onChange', () => {
    let changes = 0;
    const fsm = createBookFsm(() => {
      changes += 1;
    });
    fsm.send('TAP');
    fsm.send('ARRIVED');
    expect(fsm.send('TAP')).toBe(false);
    expect(changes).toBe(2);
    expect(fsm.state).toBe('flying');
  });
});
