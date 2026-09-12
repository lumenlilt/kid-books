import { BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, type BufferGeometry, type Material } from 'three';
import { segment } from '../../lib/fit-rect';
import { paper } from '../materials';
import { skyColorAt } from '../window';

/**
 * 時鐘書的紙雕舞台。座標＝書的本體座標（X 橫跨兩頁、Y 朝書的遠端、Z 是頁面法線）。
 * 每個紙片以底邊為鉸鏈：rotation.x 從 0（平躺、朝遠端）到 π/2（立起、沿法線）。
 * 三層交錯立起：天空卡 → 鐘樓 → 小屋；躺平時同時縮小，免得伸出頁面。
 */
export interface ClockStage {
  group: Group;
  setRise(t: number): void;
  setTime(h: number, m: number): void;
  setHour(hour: number): void;
  update(dt: number): void;
  dispose(): void;
}

export function createClockStage(): ClockStage {
  const g = new Group();
  const geos: BufferGeometry[] = [];
  const mats: Material[] = [];
  const geo = <T extends BufferGeometry>(x: T): T => {
    geos.push(x);
    return x;
  };
  const mat = <T extends Material>(x: T): T => {
    mats.push(x);
    return x;
  };
  const mesh = (geometry: BufferGeometry, material: Material) => {
    const m = new Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // 地面：平貼頁面、不立起
  const ground = mesh(geo(new PlaneGeometry(1.16, 0.62)), mat(paper(0x9fd39a, { flat: false })));
  ground.position.set(0, 0.02, 0.004);
  g.add(ground);

  // 天空卡（後層）
  const back = new Group();
  back.position.set(0, 0.42, 0.006);
  const skyMat = mat(new MeshBasicMaterial({ color: 0x9fd3ff }));
  const sky = mesh(geo(new PlaneGeometry(1.16, 0.72)), skyMat);
  sky.position.set(0, 0.36, 0);
  back.add(sky);
  const sun = mesh(geo(new CircleGeometry(0.075, 24)), mat(new MeshBasicMaterial({ color: 0xfff0a0 })));
  sun.position.set(-0.35, 0.5, 0.004);
  back.add(sun);
  const moon = mesh(geo(new CircleGeometry(0.06, 24)), mat(new MeshBasicMaterial({ color: 0xfff8e0 })));
  moon.position.set(0.35, 0.5, 0.004);
  back.add(moon);
  g.add(back);

  // 鐘樓（中層）
  const mid = new Group();
  mid.position.set(0.12, 0.12, 0.012);
  mid.scale.setScalar(0.85);
  const tower = mesh(geo(new BoxGeometry(0.3, 0.55, 0.06)), mat(paper(0xf3d9b1)));
  tower.position.set(0, 0.275, 0);
  mid.add(tower);
  const roof = mesh(geo(new ConeGeometry(0.24, 0.18, 4)), mat(paper(0xd9534f)));
  roof.position.set(0, 0.64, 0);
  roof.rotation.y = Math.PI / 4;
  mid.add(roof);
  const face = mesh(geo(new CylinderGeometry(0.115, 0.115, 0.02, 32)), mat(paper(0xfffdf5, { flat: false })));
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0.36, 0.04);
  mid.add(face);
  const rim = mesh(geo(new CylinderGeometry(0.13, 0.13, 0.012, 32)), mat(paper(0x8a5a3c, { flat: false })));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.36, 0.032);
  mid.add(rim);
  for (let i = 0; i < 12; i += 1) {
    const tick = mesh(geo(new BoxGeometry(i % 3 === 0 ? 0.02 : 0.012, i % 3 === 0 ? 0.03 : 0.02, 0.006)), mat(paper(0x3a2e2a, { flat: false })));
    const a = (i / 12) * Math.PI * 2;
    tick.position.set(Math.sin(a) * 0.095, 0.36 + Math.cos(a) * 0.095, 0.052);
    tick.rotation.z = -a;
    mid.add(tick);
  }
  const hourHand = new Group();
  hourHand.position.set(0, 0.36, 0.056);
  const hourMesh = mesh(geo(new BoxGeometry(0.02, 0.065, 0.008)), mat(paper(0x3a2e2a, { flat: false })));
  hourMesh.position.y = 0.028;
  hourHand.add(hourMesh);
  const minuteHand = new Group();
  minuteHand.position.set(0, 0.36, 0.062);
  const minuteMesh = mesh(geo(new BoxGeometry(0.014, 0.095, 0.008)), mat(paper(0xd9534f, { flat: false })));
  minuteMesh.position.y = 0.042;
  minuteHand.add(minuteMesh);
  const pin = mesh(geo(new CylinderGeometry(0.012, 0.012, 0.02, 12)), mat(paper(0xffd45a, { flat: false })));
  pin.rotation.x = Math.PI / 2;
  pin.position.set(0, 0.36, 0.066);
  mid.add(hourHand, minuteHand, pin);
  g.add(mid);

  // 小屋（前層）
  const front = new Group();
  front.position.set(-0.36, -0.2, 0.018);
  front.scale.setScalar(0.9);
  const house = mesh(geo(new BoxGeometry(0.26, 0.2, 0.06)), mat(paper(0xfff1dc)));
  house.position.set(0, 0.1, 0);
  front.add(house);
  const houseRoof = mesh(geo(new ConeGeometry(0.2, 0.14, 4)), mat(paper(0x5b8e7d)));
  houseRoof.position.set(0, 0.27, 0);
  houseRoof.rotation.y = Math.PI / 4;
  front.add(houseRoof);
  const door = mesh(geo(new BoxGeometry(0.06, 0.1, 0.01)), mat(paper(0x8a5a3c, { flat: false })));
  door.position.set(0.04, 0.05, 0.034);
  front.add(door);
  const bush = mesh(geo(new CylinderGeometry(0.07, 0.09, 0.09, 8)), mat(paper(0x7cc76f)));
  bush.position.set(0.55, 0.045, 0);
  front.add(bush);
  g.add(front);

  const layers: Array<{ group: Group; from: number; to: number; base: number }> = [
    { group: back, from: 0.0, to: 0.55, base: back.scale.x },
    { group: mid, from: 0.25, to: 0.8, base: mid.scale.x },
    { group: front, from: 0.5, to: 1.0, base: front.scale.x },
  ];

  let t = 0;
  return {
    group: g,
    setRise(k) {
      for (const layer of layers) {
        const r = segment(k, layer.from, layer.to);
        const eased = 1 - (1 - r) ** 3;
        layer.group.rotation.x = (Math.PI / 2) * eased;
        const s = layer.base * (0.25 + 0.75 * eased);
        layer.group.scale.set(s, s, s);
      }
    },
    setTime(h, m) {
      hourHand.rotation.z = -(((h % 12) + m / 60) / 12) * Math.PI * 2;
      minuteHand.rotation.z = -(m / 60) * Math.PI * 2;
    },
    setHour(hour) {
      skyMat.color.copy(skyColorAt(hour));
      const day = (hour - 6) / 12;
      sun.visible = day >= 0 && day <= 1;
      if (sun.visible) sun.position.set(-0.45 + 0.9 * day, 0.18 + Math.sin(day * Math.PI) * 0.34, 0.004);
      const nightK = ((((hour - 18) % 24) + 24) % 24) / 12;
      moon.visible = nightK >= 0 && nightK <= 1;
      if (moon.visible) moon.position.set(-0.45 + 0.9 * nightK, 0.18 + Math.sin(nightK * Math.PI) * 0.34, 0.004);
    },
    update(dt) {
      t += dt;
      sun.scale.setScalar(1 + Math.sin(t * 1.5) * 0.04);
    },
    dispose() {
      for (const x of geos) x.dispose();
      for (const x of mats) x.dispose();
      g.removeFromParent();
    },
  };
}
