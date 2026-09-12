import ui from '../../content/ui.json';
import type { ActivityDef } from '../content/schema';
import type { Activity, ActivityContext } from './types';

type Def = Extract<ActivityDef, { type: 'bridge' }>;

const checkSvg = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** 真實世界的橋：大鐘顯示裝置現在的時間，去找家人看家裡的時鐘；按「我看過了」就完成。 */
export function createBridge(_def: Def): Activity {
  let ctx: ActivityContext | null = null;
  return {
    mount(c) {
      ctx = c;
      const stack = document.createElement('div');
      stack.className = 'deck-stack';
      c.deck.append(stack);
      const clock = c.mountClock({ frac: 0.6, interactive: false, into: stack });
      const live = () => {
        const d = new Date();
        clock.setTotal(d.getHours() * 60 + d.getMinutes());
      };
      live();
      const timer = window.setInterval(live, 15000);
      c.signal.addEventListener('abort', () => window.clearInterval(timer), { once: true });
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-btn big-btn';
      btn.innerHTML = `${checkSvg}<span>${ui.book.done}</span>`;
      btn.addEventListener('click', () => {
        btn.disabled = true;
        ctx?.complete();
      });
      stack.append(btn);
    },
    start() {},
  };
}
