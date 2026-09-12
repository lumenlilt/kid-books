import { BoxGeometry, CircleGeometry, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';
import { paper } from './materials';
import type { Palette } from './palette';

/** 窗戶：天色與日月跟著裝置的真實時間走——這本身就是時鐘書的伏筆。 */
export interface RoomWindow {
  group: Group;
  setHour(hour: number): void;
}

const KEYS: Array<[number, number]> = [
  [0, 0x1b1a3a], [5, 0x2e2a5a], [6, 0xf3a26b], [7, 0xffd08a], [9, 0x9fd3ff], [15, 0x8ccbff], [18, 0xffa15c], [19.5, 0x8a5a9a], [21, 0x27244d], [24, 0x1b1a3a],
];

export function skyColorAt(hour: number): Color {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const a = KEYS[i];
    const b = KEYS[i + 1];
    if (!a || !b) continue;
    if (h >= a[0] && h <= b[0]) {
      const k = (h - a[0]) / (b[0] - a[0] || 1);
      return new Color(a[1]).lerp(new Color(b[1]), k);
    }
  }
  return new Color(KEYS[0]?.[1] ?? 0);
}

/** 0 白天 … 1 深夜 */
export function nightAmountAt(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h <= 17) return 0;
  if (h > 17 && h < 20) return (h - 17) / 3;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  return 1;
}

export function createWindow(palette: Palette, width = 1.0, height = 1.15): RoomWindow {
  const g = new Group();
  const frame = paper(palette.paper, { flat: false });
  const t = 0.06;
  const depth = 0.08;
  const bar = (sx: number, sy: number, x: number, y: number) => {
    const m = new Mesh(new BoxGeometry(sx, sy, depth), frame);
    m.position.set(x, y, 0);
    m.castShadow = true;
    g.add(m);
  };
  bar(width + t, t, 0, height / 2);
  bar(width + t, t, 0, -height / 2);
  bar(t, height, -width / 2, 0);
  bar(t, height, width / 2, 0);
  bar(t * 0.7, height, 0, 0);
  bar(width, t * 0.7, 0, 0);

  const skyMat = new MeshBasicMaterial({ color: 0x9fd3ff });
  const sky = new Mesh(new PlaneGeometry(width, height), skyMat);
  sky.position.z = -0.03;
  g.add(sky);

  const sun = new Mesh(new CircleGeometry(0.1, 24), new MeshBasicMaterial({ color: 0xfff0a0 }));
  sun.position.z = -0.02;
  g.add(sun);
  const moon = new Mesh(new CircleGeometry(0.08, 24), new MeshBasicMaterial({ color: 0xfff8e0 }));
  moon.position.z = -0.02;
  g.add(moon);

  const sill = new Mesh(new BoxGeometry(width + 0.2, 0.05, 0.16), paper(palette.wood));
  sill.position.set(0, -height / 2 - 0.05, 0.04);
  sill.castShadow = true;
  g.add(sill);

  return {
    group: g,
    setHour(hour) {
      skyMat.color.copy(skyColorAt(hour));
      // 太陽 6→18 走一道弧；月亮 18→6
      const day = (hour - 6) / 12;
      const sunVisible = day >= 0 && day <= 1;
      sun.visible = sunVisible;
      if (sunVisible) sun.position.set(-width / 2 + width * day, -height / 2 + Math.sin(day * Math.PI) * height * 0.9, -0.02);
      const nightK = (((hour - 18) % 24) + 24) % 24 / 12;
      const moonVisible = nightK >= 0 && nightK <= 1;
      moon.visible = moonVisible;
      if (moonVisible) moon.position.set(-width / 2 + width * nightK, -height / 2 + Math.sin(nightK * Math.PI) * height * 0.9, -0.02);
    },
  };
}

/** 裝置時間（小時，含小數）；?hour= 可覆蓋，測試用。 */
export function currentHour(search = window.location.search): number {
  const q = new URLSearchParams(search).get('hour');
  if (q !== null && q !== '' && Number.isFinite(Number(q))) return Number(q);
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
