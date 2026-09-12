import ui from '../../content/ui.json';

export interface Hud {
  root: HTMLElement;
  setStars(n: number): void;
  setSound(on: boolean): void;
  onSoundToggle(fn: () => void): void;
  onProfile(fn: () => void): void;
}

const speakerSvg = (on: boolean) =>
  `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/>${
    on ? '<path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>' : '<path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  }</svg>`;

/** 沒有文字選單：不識字的小孩看得懂的只有圖示與聲音。 */
export function createHud(container: HTMLElement): Hud {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <button class="hud-btn hud-profile" type="button" aria-label="${ui.hud.profile}"><span class="hud-avatar">🙂</span></button>
    <div class="hud-right">
      <div class="hud-pill hud-stars" aria-label="${ui.hud.stars}"><span class="hud-star">⭐</span><span class="hud-count">0</span></div>
      <button class="hud-btn hud-sound" type="button" aria-label="${ui.hud.sound}" aria-pressed="true">${speakerSvg(true)}</button>
    </div>`;
  container.append(root);
  const count = root.querySelector<HTMLElement>('.hud-count');
  const sound = root.querySelector<HTMLButtonElement>('.hud-sound');
  const profile = root.querySelector<HTMLButtonElement>('.hud-profile');
  let soundHandler = () => {};
  let profileHandler = () => {};
  sound?.addEventListener('click', () => soundHandler());
  profile?.addEventListener('click', () => profileHandler());
  return {
    root,
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
  };
}
