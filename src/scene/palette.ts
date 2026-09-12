// 色板集中在這一檔：換色調就是換這裡，場景程式碼不碰顏色字面值。
// 三組給使用者在瀏覽器裡挑（?palette=dusk|morning|candy）。
export interface Palette {
  readonly name: string;
  /** 窗外天空的基底（也是場景背景） */
  readonly sky: number;
  /** 半球光的天色 */
  readonly skyLight: number;
  readonly wall: number;
  readonly wallTrim: number;
  readonly floor: number;
  readonly rug: number;
  readonly wood: number;
  readonly woodDark: number;
  readonly accent: number;
  readonly paper: number;
  readonly ink: number;
}

export const palettes = {
  dusk: {
    name: 'dusk', sky: 0x2b2340, skyLight: 0xffe0c0, wall: 0xf3e2c7, wallTrim: 0xe2c9a4, floor: 0xb98a5c, rug: 0xd96c5a,
    wood: 0xa26d48, woodDark: 0x805239, accent: 0xff9f5a, paper: 0xfff6e5, ink: 0x3a2e2a,
  },
  morning: {
    name: 'morning', sky: 0x9fd3ff, skyLight: 0xffffff, wall: 0xfff3d6, wallTrim: 0xf0dcb0, floor: 0xd9b27c, rug: 0x7cc7b0,
    wood: 0xc98f62, woodDark: 0xa46e48, accent: 0xff7f6b, paper: 0xffffff, ink: 0x2f3b4a,
  },
  candy: {
    name: 'candy', sky: 0xb9a6ff, skyLight: 0xfff0ff, wall: 0xffe4ef, wallTrim: 0xf7c9dc, floor: 0xf3d9c0, rug: 0xffb3c6,
    wood: 0xc98a6a, woodDark: 0xa5674a, accent: 0x7bd3ff, paper: 0xfff9fc, ink: 0x4a2f4a,
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

export function isPaletteName(v: string): v is PaletteName {
  return Object.hasOwn(palettes, v);
}

/**
 * ?palette=… 優先；否則跟著時間走：白天 morning、傍晚後 dusk（使用者裁示 2026-09-12）。
 * 早上開與晚上開是兩個不同的房間——小孩會發現，而這正是時鐘書的伏筆。
 */
export function resolvePalette(hour: number, search = window.location.search): Palette {
  const q = new URLSearchParams(search).get('palette') ?? '';
  if (isPaletteName(q)) return palettes[q];
  const h = ((hour % 24) + 24) % 24;
  return h >= 6.5 && h < 18 ? palettes.morning : palettes.dusk;
}

export const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
