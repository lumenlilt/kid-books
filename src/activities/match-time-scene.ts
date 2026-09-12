import type { ActivityDef } from '../content/schema';
import { toTotal } from '../lib/clock-math';
import { tweens } from '../lib/tween';
import { untilAbort, type Activity, type ActivityContext } from './types';
import type { ClockSvg } from '../ui/clock-svg';

type Def = Extract<ActivityDef, { type: 'match-time-scene' }>;

const wait = (ms: number) => tweens.add({ duration: 1, delay: ms, onUpdate: () => {} }).finished;

/** 小明的一天：時鐘（與天色）顯示一個時刻，小孩點對應的場景卡。答對才唸那一句。 */
export function createMatchTimeScene(def: Def): Activity {
  let ctx: ActivityContext | null = null;
  let clock: ClockSvg | null = null;
  const cards = new Map<string, HTMLButtonElement>();
  let pick: ((id: string) => void) | null = null;

  return {
    mount(c) {
      ctx = c;
      const stack = document.createElement('div');
      stack.className = 'deck-stack';
      c.deck.append(stack);
      clock = c.mountClock({ frac: 0.5, interactive: false, into: stack });
      const row = document.createElement('div');
      row.className = 'card-row';
      for (const card of def.cards) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        btn.innerHTML = `<span class="card-icon">${card.icon}</span><span>${card.label}</span>`;
        btn.addEventListener('click', () => pick?.(card.id));
        row.append(btn);
        cards.set(card.id, btn);
      }
      stack.append(row);
    },
    async start() {
      if (!ctx || !clock) return;
      const { narrator, signal } = ctx;
      const cl = clock;
      const say = (id: string) => untilAbort(narrator.say(id), signal);
      for (const pair of def.pairs) {
        for (const btn of cards.values()) if (!btn.classList.contains('is-done')) btn.className = 'card';
        await untilAbort(cl.animateTo(toTotal(pair.time), 1000), signal);
        await untilAbort(wait(300), signal);
        let wrong = 0;
        await untilAbort(
          new Promise<void>((resolve) => {
            pick = (id) => {
              const btn = cards.get(id);
              if (!btn || btn.classList.contains('is-done')) return;
              if (id === pair.card) {
                pick = null;
                btn.className = 'card is-correct';
                resolve();
              } else {
                wrong += 1;
                btn.className = 'card is-wrong';
                void narrator.say(def.wrongSay);
                if (wrong >= def.maxWrongBeforeShow) {
                  const right = cards.get(pair.card);
                  if (right) right.className = 'card is-hint';
                }
              }
            };
          }),
          signal,
        );
        await say(pair.say);
        const done = cards.get(pair.card);
        if (done) done.className = 'card is-done';
      }
      ctx.complete();
    },
  };
}
