import type { ActivityDef } from '../content/schema';
import { toTotal } from '../lib/clock-math';
import { tweens } from '../lib/tween';
import { createClockSvg, type ClockSvg } from '../ui/clock-svg';
import { untilAbort, type Activity, type ActivityContext } from './types';

type Def = Extract<ActivityDef, { type: 'clock-choose' }>;

const wait = (ms: number) => tweens.add({ duration: 1, delay: ms, onUpdate: () => {} }).finished;

/** 「哪一個是 8 點？」：三個小時鐘選一個；錯了溫和重問，錯兩次就把對的那個標出來。 */
export function createClockChoose(def: Def): Activity {
  let ctx: ActivityContext | null = null;
  const cards: HTMLButtonElement[] = [];
  const clocks: ClockSvg[] = [];
  let pick: ((i: number) => void) | null = null;

  return {
    mount(c) {
      ctx = c;
      const row = document.createElement('div');
      row.className = 'card-row';
      const n = Math.max(...def.rounds.map((r) => r.options.length));
      for (let i = 0; i < n; i += 1) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'card';
        const clock = createClockSvg();
        clock.setInteractive(false);
        clock.setMode({ hands: 'both', draggable: [], snap: null });
        btn.append(clock.el);
        btn.addEventListener('click', () => pick?.(i));
        row.append(btn);
        cards.push(btn);
        clocks.push(clock);
      }
      c.deck.append(row);
      c.signal.addEventListener('abort', () => clocks.forEach((k) => k.destroy()), { once: true });
    },
    async start() {
      if (!ctx) return;
      const { narrator, signal } = ctx;
      const say = (id: string) => untilAbort(narrator.say(id), signal);
      for (const round of def.rounds) {
        // 打亂位置，答案不會永遠在同一格
        const order = round.options.map((_, i) => i).sort(() => Math.random() - 0.5);
        order.forEach((optIndex, pos) => {
          const clock = clocks[pos];
          const card = cards[pos];
          const opt = round.options[optIndex];
          if (!clock || !card || !opt) return;
          clock.setTotal(toTotal(opt));
          card.hidden = false;
          card.className = 'card';
        });
        for (let pos = order.length; pos < cards.length; pos += 1) {
          const card = cards[pos];
          if (card) card.hidden = true;
        }
        const answerPos = order.indexOf(round.answer);
        await say(round.say);
        let wrong = 0;
        await untilAbort(
          new Promise<void>((resolve) => {
            pick = (pos) => {
              const card = cards[pos];
              if (!card) return;
              if (pos === answerPos) {
                pick = null;
                card.className = 'card is-correct';
                const opt = round.options[round.answer];
                if (opt) ctx?.mirror(toTotal(opt));
                resolve();
              } else {
                wrong += 1;
                ctx?.recordAttempt();
                card.className = 'card is-wrong';
                void narrator.say(def.wrongSay);
                if (wrong >= def.maxWrongBeforeShow) {
                  const right = cards[answerPos];
                  if (right) right.className = 'card is-hint';
                }
              }
            };
          }),
          signal,
        );
        await say(def.rightSay);
        await untilAbort(wait(400), signal);
      }
      ctx.complete();
    },
  };
}
