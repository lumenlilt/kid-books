import ui from '../../content/ui.json';
import { AVATAR_IDS, type AvatarId } from '../app/store';
import { AVATARS } from '../ui/avatars';

/** 誰在玩？四個紙偶，點一個就是那個人。沒有文字輸入——小孩自己選得了。 */
export interface ProfilePicker {
  root: HTMLElement;
  open(active: AvatarId | null): Promise<AvatarId>;
  readonly isOpen: boolean;
}

export function createProfilePicker(container: HTMLElement): ProfilePicker {
  const root = document.createElement('div');
  root.className = 'picker';
  root.hidden = true;
  root.innerHTML = `<div class="picker-card"><h1 class="picker-title">${ui.profile.title}</h1><div class="picker-row">${AVATAR_IDS.map(
    (id) => `<button class="picker-avatar" type="button" data-id="${id}" style="--ring:${AVATARS[id].color}" aria-label="${id}">${AVATARS[id].svg}</button>`,
  ).join('')}</div></div>`;
  container.append(root);
  let resolveFn: ((id: AvatarId) => void) | null = null;
  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.picker-avatar');
    const id = btn?.dataset['id'];
    if (!btn || !id) return;
    btn.classList.add('is-picked');
    window.setTimeout(() => {
      root.hidden = true;
      btn.classList.remove('is-picked');
      resolveFn?.(id as AvatarId);
      resolveFn = null;
    }, 260);
  });
  return {
    root,
    get isOpen() {
      return !root.hidden;
    },
    open(active) {
      for (const b of root.querySelectorAll<HTMLButtonElement>('.picker-avatar')) b.classList.toggle('is-active', b.dataset['id'] === active);
      root.hidden = false;
      return new Promise<AvatarId>((resolve) => {
        resolveFn = resolve;
      });
    },
  };
}
