import { CircleGeometry, Color, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Shape } from 'three';
import { loadModel } from './assets';
import { paper, texturedToy } from './materials';
import type { Palette } from './palette';

/** 窗戶：天色與日月跟著裝置的真實時間走——這本身就是時鐘書的伏筆。 */
export interface RoomWindow {
  group: Group;
  setHour(hour: number): void;
  update(dt: number): void;
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
  // 窗框、線板、窗台、花箱：tools/blender/window.py 的模型（D30），依材質名染色板色
  const mats: Record<string, MeshStandardMaterial> = {
    Frame: paper(palette.paper, { roughness: 0.6 }),
    Sill: texturedToy('wood', palette.wood, { repeat: 2, roughness: 0.75, normalScale: 0.4, gain: 2.4 }),
    Casing: paper(palette.wallTrim, { roughness: 0.7 }),
    Box: paper(palette.woodDark, { roughness: 0.8 }),
    Flower: paper(palette.accent, { roughness: 0.55 }),
    Leaf: paper(0x6fbf73, { roughness: 0.7 }),
  };
  void loadModel('/assets/models/window.glb').then((model) => {
    model.traverse((o) => {
      if (o instanceof Mesh && !Array.isArray(o.material)) {
        const m = mats[o.material.name];
        if (m) o.material = m;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.add(model);
  });

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

  // 窗外：兩層紙雕山丘＋兩朵慢慢飄的雲（都在窗框範圍內、貼在天空前面）
  const hill = (w: number, h: number, color: number, x: number, y: number, z: number) => {
    const sh = new Shape();
    sh.moveTo(-w / 2, 0);
    sh.quadraticCurveTo(-w / 4, h, 0, h * 0.8);
    sh.quadraticCurveTo(w / 4, h * 1.1, w / 2, 0);
    sh.closePath();
    const m = new Mesh(new ExtrudeGeometry(sh, { depth: 0.016, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.006, bevelSegments: 3 }), new MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  hill(1.3, 0.34, 0x8fcf8a, 0.15, -height / 2 + 0.02, -0.028);
  hill(1.0, 0.26, 0x5fae74, -0.25, -height / 2 + 0.02, -0.024);
  const cloudMat = new MeshBasicMaterial({ color: 0xffffff });
  const cloudGeo = (w: number) => {
    const sh = new Shape();
    sh.moveTo(-w / 2, 0);
    sh.absarc(-w * 0.28, 0.01, w * 0.2, Math.PI, Math.PI * 1.9, false);
    sh.absarc(0, 0.04, w * 0.26, Math.PI * 1.1, Math.PI * 1.95, false);
    sh.absarc(w * 0.28, 0.01, w * 0.2, Math.PI * 1.15, Math.PI * 2, false);
    sh.lineTo(w / 2, 0);
    sh.closePath();
    return new ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.005, bevelSegments: 3 });
  };
  const clouds = [new Mesh(cloudGeo(0.3), cloudMat), new Mesh(cloudGeo(0.22), cloudMat)];
  clouds[0]?.position.set(-0.2, height * 0.22, -0.026);
  clouds[1]?.position.set(0.25, height * 0.05, -0.026);
  for (const c of clouds) g.add(c);


  let elapsed = 0;
  return {
    group: g,
    update(dt) {
      elapsed += dt;
      clouds.forEach((c, i) => {
        const base = i === 0 ? -0.2 : 0.25;
        c.position.x = base + Math.sin(elapsed * 0.08 + i * 2) * 0.12;
      });
    },
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
