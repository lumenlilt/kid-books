import ui from '../../content/ui.json';
import type { ActivityDef } from '../content/schema';
import type { Activity, ActivityContext } from './types';

type Def = Extract<ActivityDef, { type: 'ceremony' }>;

/** 頒獎：徽章＋星星總數；回書架（M4 接房間裝飾）。 */
export function createCeremony(_def: Def): Activity {
  return {
    mount(c: ActivityContext) {
      const box = document.createElement('div');
      box.className = 'ceremony';
      box.innerHTML = `<div class="badge">🕒</div><div class="stars">⭐ × ${c.totalStars()}</div>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hud-btn big-btn';
      btn.textContent = ui.book.close;
      btn.addEventListener('click', () => {
        btn.disabled = true;
        c.finish();
      });
      box.append(btn);
      c.deck.append(box);
    },
    start() {},
  };
}
