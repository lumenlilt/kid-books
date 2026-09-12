import type { AvatarId } from '../app/store';

/** 四個紙偶頭像（原創 SVG，CC BY 4.0）。同一份圖給 HUD、選角畫面，也烤成舞台裡的紙片。 */
const face = (skin: string, hair: string, hairShape: string, shirt: string, extra = '') => `
<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M20 118 Q50 78 80 118 Z" fill="${shirt}"/>
  <circle cx="50" cy="52" r="30" fill="${skin}"/>
  ${hairShape.replace(/HAIR/g, hair)}
  <circle cx="39" cy="54" r="3.6" fill="#2b2220"/><circle cx="61" cy="54" r="3.6" fill="#2b2220"/>
  <circle cx="40.5" cy="52.5" r="1.2" fill="#fff"/><circle cx="62.5" cy="52.5" r="1.2" fill="#fff"/>
  <path d="M42 66 Q50 73 58 66" stroke="#2b2220" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <circle cx="31" cy="63" r="5" fill="#ff9aa8" opacity=".7"/><circle cx="69" cy="63" r="5" fill="#ff9aa8" opacity=".7"/>
  ${extra}
</svg>`;

export const AVATARS: Record<AvatarId, { svg: string; color: string }> = {
  sunny: {
    color: '#ffb454',
    svg: face('#ffd9b3', '#4a2f1a', '<path d="M20 50 Q22 20 50 20 Q78 20 80 50 Q66 34 50 36 Q34 34 20 50 Z" fill="HAIR"/><circle cx="22" cy="40" r="9" fill="HAIR"/><circle cx="78" cy="40" r="9" fill="HAIR"/>', '#ff7f6b'),
  },
  river: {
    color: '#7bd3ff',
    svg: face('#f2c9a1', '#1f2a44', '<path d="M18 48 Q20 18 50 18 Q80 18 82 48 L72 40 Q60 30 50 34 Q40 30 28 40 Z" fill="HAIR"/>', '#5b8ee0', '<path d="M22 30 Q50 6 78 30 L74 34 Q50 14 26 34 Z" fill="#3fbf8f"/>'),
  },
  mochi: {
    color: '#ffb3c6',
    svg: face('#ffe1c9', '#6b4a3a', '<path d="M18 52 Q16 20 50 18 Q84 20 82 52 Q74 40 50 44 Q26 40 18 52 Z" fill="HAIR"/><circle cx="50" cy="18" r="8" fill="#ff9aa8"/>', '#c77dbb'),
  },
  pepper: {
    color: '#9ad36f',
    svg: face('#c58c5c', '#2b2220', '<path d="M18 46 Q18 16 50 16 Q82 16 82 46 Q80 30 50 30 Q20 30 18 46 Z" fill="HAIR"/><circle cx="30" cy="22" r="7" fill="HAIR"/><circle cx="50" cy="16" r="7" fill="HAIR"/><circle cx="70" cy="22" r="7" fill="HAIR"/>', '#f4a259'),
  },
};
