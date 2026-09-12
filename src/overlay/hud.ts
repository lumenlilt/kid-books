import ui from '../../content/ui.json';
import type { AvatarId } from '../app/store';
import { AVATARS } from '../ui/avatars';

export interface Hud {
  root: HTMLElement;
  /** 星星飛進去的那顆 */
  starTarget: Element;
  setStars(n: number): void;
  setSound(on: boolean): void;
  onSoundToggle(fn: () => void): void;
  onProfile(fn: () => void): void;
  onBack(fn: () => void): void;
  /** 長按頭像（家長報告） */
  onProfileLongPress(fn: () => void): void;
  setAvatar(id: AvatarId | null): void;
  /** 閱讀中：頭像讓位給返回鍵 */
  setReading(on: boolean): void;
}

const backSvg = `<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true"><path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const speakerSvg = (on: boolean) =>
  `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>${
    on ? '<path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  }</svg>`;

/** 沒有文字選單：不識字的小孩看得懂的只有圖示與聲音。 */
export function createHud(container: HTMLElement): Hud {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-left">
      <button class="hud-btn hud-profile" type="button" aria-label="${ui.hud.profile}"><span class="hud-avatar">🙂</span></button>
      <button class="hud-btn hud-back" type="button" aria-label="${ui.book.close}" hidden>${backSvg}</button>
    </div>
    <div class="hud-right">
      <div class="hud-pill hud-stars" aria-label="${ui.hud.stars}"><span class="hud-star">⭐</span><span class="hud-count">0</span></div>
      <button class="hud-btn hud-sound" type="button" aria-label="${ui.hud.sound}" aria-pressed="true">${speakerSvg(true)}</button>
    </div>`;
  container.append(root);
  const count = root.querySelector<HTMLElement>('.hud-count');
  const sound = root.querySelector<HTMLButtonElement>('.hud-sound');
  const profile = root.querySelector<HTMLButtonElement>('.hud-profile');
  const back = root.querySelector<HTMLButtonElement>('.hud-back');
  let soundHandler = () => {};
  let profileHandler = () => {};
  let backHandler = () => {};
  let longHandler = () => {};
  sound?.addEventListener('click', () => soundHandler());
  back?.addEventListener('click', () => backHandler());
  // 頭像：短按換人、長按 600 ms 開家長報告（小孩不會誤入）
  let pressTimer = 0;
  let longFired = false;
  profile?.addEventListener('pointerdown', () => {
    longFired = false;
    pressTimer = window.setTimeout(() => {
      longFired = true;
      longHandler();
    }, 600);
  });
  const cancelPress = () => window.clearTimeout(pressTimer);
  profile?.addEventListener('pointerup', cancelPress);
  profile?.addEventListener('pointercancel', cancelPress);
  profile?.addEventListener('pointerleave', cancelPress);
  profile?.addEventListener('click', () => {
    if (!longFired) profileHandler();
  });
  profile?.addEventListener('contextmenu', (e) => e.preventDefault());
  const starTarget = root.querySelector('.hud-stars') ?? root;
  return {
    root,
    starTarget,
    setStars(n) {
      if (count) count.textContent = String(n);
    },
    setSound(on) {
      if (!sound) return;
      sound.innerHTML = speakerSvg(on);
      sound.setAttribute('aria-pressed', String(on));
    },
    onSoundToggle(fn) {
      soundHandler = fn;
    },
    onProfile(fn) {
      profileHandler = fn;
    },
    onBack(fn) {
      backHandler = fn;
    },
    onProfileLongPress(fn) {
      longHandler = fn;
    },
    setAvatar(id) {
      const el = root.querySelector<HTMLElement>('.hud-avatar');
      if (!el) return;
      if (id) {
        el.innerHTML = AVATARS[id].svg;
        el.classList.add('has-avatar');
      } else {
        el.textContent = '🙂';
        el.classList.remove('has-avatar');
      }
    },
    setReading(on) {
      root.classList.toggle('is-reading', on);
      if (profile) profile.hidden = on;
      if (back) back.hidden = !on;
    },
  };
}
