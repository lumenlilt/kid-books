import type { ActivityDef } from '../content/schema';
import { fromTotal, sameOnFace, toTotal } from '../lib/clock-math';
import { tweens } from '../lib/tween';
import { createHintLadder } from './hints';
import { untilAbort, type Activity, type ActivityContext } from './types';
import type { ClockSvg } from '../ui/clock-svg';

type Def = Extract<ActivityDef, { type: 'clock-set' }>;

const wait = (ms: number) => tweens.add({ duration: 1, delay: ms, onUpdate: () => {} }).finished;

/** 「轉到 3 點」：一題一題，放開指針時判定；卡住有階梯提示，答錯不扣分。 */
export function createClockSet(def: Def): Activity {
  let ctx: ActivityContext | null = null;
  let clock: ClockSvg | null = null;
  return {
    mount(c) {
      ctx = c;
      clock = c.mountClock();
      clock.setMode({ hands: def.hands, draggable: def.hands === 'hour' ? ['hour'] : ['hour', 'minute'], snap: def.snap });
      clock.setTotal(toTotal(def.startTime));
    },
    async start() {
      if (!ctx || !clock) return;
      const { narrator, signal } = ctx;
      const cl = clock;
      const say = (id: string) => untilAbort(narrator.say(id), signal);

      if (def.demo) {
        cl.setInteractive(false);
        await Promise.all([say(def.demo.say), untilAbort(cl.animateTo(toTotal(def.demo.to), 2600), signal)]);
        await untilAbort(wait(700), signal);
        await untilAbort(cl.animateTo(toTotal(def.startTime), 800), signal);
        cl.setInteractive(true);
      }

      for (const task of def.tasks) {
        const targetTotal = toTotal(task.target);
        const hints = createHintLadder(def.hints.afterMs, def.hints.ladder, {
          repeat: () => say(task.say),
          say: (id) => say(id),
          highlight: async () => {
            cl.highlight(task.target.h);
            if (def.hands === 'both') cl.ghost(targetTotal);
          },
          demonstrate: async () => {
            ctx?.recordAttempt();
            cl.setInteractive(false);
            const before = cl.getTotal();
            await untilAbort(cl.animateTo(targetTotal, 1200), signal);
            await untilAbort(wait(800), signal);
            await untilAbort(cl.animateTo(before, 700), signal);
            cl.setInteractive(true);
            await say(task.say);
          },
        }, signal);

        await say(task.say);
        hints.arm();
        const offInteract = cl.onInteract(() => hints.touch());
        await untilAbort(
          new Promise<void>((resolve) => {
            const off = cl.onRelease((total) => {
              if (sameOnFace(fromTotal(total), task.target)) {
                off();
                ctx?.sfx('correct');
                resolve();
              } else {
                ctx?.sfx('tap');
              }
            });
            signal.addEventListener('abort', () => off(), { once: true });
          }),
          signal,
        );
        offInteract();
        hints.reset();
        cl.highlight(null);
        cl.ghost(null);
        await untilAbort(wait(350), signal);
      }
      ctx.complete();
    },
  };
}
