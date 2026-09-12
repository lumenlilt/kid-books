import type { ActivityDef } from '../content/schema';
import { toTotal } from '../lib/clock-math';
import type { Activity, ActivityContext } from './types';

type Def = Extract<ActivityDef, { type: 'clock-free' }>;

/** 轉轉看：自由拖，互動 N 次就得星。世界（太陽月亮）跟著變是這一頁的全部教學。 */
export function createClockFree(def: Def): Activity {
  let ctx: ActivityContext | null = null;
  let count = 0;
  let done = false;
  return {
    mount(c) {
      ctx = c;
      const clock = c.mountClock();
      clock.setMode({ hands: 'both', draggable: ['hour', 'minute'], snap: null });
      clock.setTotal(toTotal(def.startTime));
      clock.onRelease(() => ctx?.sfx('tap'));
      clock.onInteract(() => {
        count += 1;
        if (!done && count >= def.interactionsToStar) {
          done = true;
          // 讓小孩把這一下拖完再頒星
          const off = clock.onRelease(() => {
            off();
            ctx?.complete();
          });
        }
      });
    },
    start() {},
  };
}
