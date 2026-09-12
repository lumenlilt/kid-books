// 色板集中在這一檔：M1 的「切換色調給使用者選」就是換這裡的值，場景程式碼不碰顏色字面值。
export interface Palette {
  readonly name: string;
  readonly sky: number;
  readonly wall: number;
  readonly floor: number;
  readonly wood: number;
  readonly accent: number;
  readonly paper: number;
  readonly ink: number;
}

export const palettes = {
  dusk: { name: 'dusk', sky: 0x2b2340, wall: 0xf3e2c7, floor: 0xb98a5c, wood: 0x8a5a3c, accent: 0xff9f5a, paper: 0xfff6e5, ink: 0x3a2e2a },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof palettes;

export const palette: Palette = palettes.dusk;
