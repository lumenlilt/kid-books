import { BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Shape, type BufferGeometry, type Material } from 'three';
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

  // 地面：平貼頁面、不立起；一條小徑從小屋到鐘樓
  const ground = mesh(geo(new PlaneGeometry(1.16, 0.62)), mat(paper(0x9fd39a, { flat: false })));
  ground.position.set(0, 0.02, 0.004);
  g.add(ground);
  const path = mesh(geo(new PlaneGeometry(0.16, 0.5)), mat(paper(0xf1dfb8, { flat: false })));
  path.position.set(-0.15, 0.0, 0.006);
  path.rotation.z = -0.55;
  g.add(path);

  // 接地陰影：放在會立起的紙片底下，柔和的深色橢圓（貼圖）
  const shadowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx) {
      const grd = ctx.createRadialGradient(64, 32, 4, 64, 32, 60);
      grd.addColorStop(0, 'rgba(40,25,20,0.35)');
      grd.addColorStop(1, 'rgba(40,25,20,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, 128, 64);
    }
    return new CanvasTexture(c);
  })();
  const contact = (x: number, y: number, w: number) => {
    const m = new Mesh(geo(new PlaneGeometry(w, w * 0.4)), mat(new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
    m.position.set(x, y, 0.0055);
    g.add(m);
  };
  contact(0.12, 0.12, 0.5);
  contact(-0.36, -0.2, 0.42);

  // 天空卡（後層）：圓角紙卡＋兩層山丘＋雲
  const back = new Group();
  back.position.set(0, 0.42, 0.006);
  const skyMat = mat(new MeshBasicMaterial({ color: 0x9fd3ff }));
  const skyShape = new Shape();
  const sw = 1.16;
  const sh = 0.72;
  const r = 0.12;
  skyShape.moveTo(-sw / 2, 0);
  skyShape.lineTo(sw / 2, 0);
  skyShape.lineTo(sw / 2, sh - r);
  skyShape.quadraticCurveTo(sw / 2, sh, sw / 2 - r, sh);
  skyShape.lineTo(-sw / 2 + r, sh);
  skyShape.quadraticCurveTo(-sw / 2, sh, -sw / 2, sh - r);
  skyShape.closePath();
  const sky = mesh(geo(new ExtrudeGeometry(skyShape, { depth: 0.012, bevelEnabled: false })), skyMat);
  sky.position.set(0, 0, -0.012);
  back.add(sky);
  const hill = (w: number, h: number, color: number, x: number, z: number) => {
    const hs = new Shape();
    hs.moveTo(-w / 2, 0);
    hs.quadraticCurveTo(-w / 4, h, 0, h * 0.85);
    hs.quadraticCurveTo(w / 4, h * 1.05, w / 2, 0);
    hs.closePath();
    const m = mesh(geo(new ExtrudeGeometry(hs, { depth: 0.01, bevelEnabled: false })), mat(paper(color, { flat: false })));
    m.position.set(x, 0, z);
    back.add(m);
  };
  hill(1.0, 0.26, 0x8fcf8a, 0.2, 0.004);
  hill(0.8, 0.2, 0x5fae74, -0.3, 0.012);
  const cloudGeo = (w: number) => {
    const cs = new Shape();
    cs.moveTo(-w / 2, 0);
    cs.absarc(-w * 0.28, 0.01, w * 0.2, Math.PI, Math.PI * 1.9, false);
    cs.absarc(0, 0.04, w * 0.26, Math.PI * 1.1, Math.PI * 1.95, false);
    cs.absarc(w * 0.28, 0.01, w * 0.2, Math.PI * 1.15, Math.PI * 2, false);
    cs.lineTo(w / 2, 0);
    cs.closePath();
    return geo(new ExtrudeGeometry(cs, { depth: 0.008, bevelEnabled: false }));
  };
  const cloudMat = mat(paper(0xffffff, { flat: false }));
  const cloudA = mesh(cloudGeo(0.26), cloudMat);
  cloudA.position.set(-0.32, 0.5, 0.006);
  const cloudB = mesh(cloudGeo(0.2), cloudMat);
  cloudB.position.set(0.3, 0.42, 0.006);
  back.add(cloudA, cloudB);
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
  const towerDoor = mesh(geo(new BoxGeometry(0.09, 0.14, 0.012)), mat(paper(0x8a5a3c, { flat: false })));
  towerDoor.position.set(0, 0.07, 0.034);
  mid.add(towerDoor);
  for (const wx of [-0.08, 0.08]) {
    const win = mesh(geo(new BoxGeometry(0.05, 0.06, 0.01)), mat(paper(0xfff1a8, { flat: false })));
    win.position.set(wx, 0.2, 0.034);
    mid.add(win);
  }
  const pole = mesh(geo(new CylinderGeometry(0.006, 0.006, 0.12, 6)), mat(paper(0x3a2e2a, { flat: false })));
  pole.position.set(0, 0.78, 0);
  mid.add(pole);
  const flag = mesh(geo(new BoxGeometry(0.07, 0.045, 0.006)), mat(paper(0xffd45a, { flat: false })));
  flag.position.set(0.04, 0.81, 0);
  mid.add(flag);
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
  const houseWin = mesh(geo(new BoxGeometry(0.05, 0.05, 0.01)), mat(paper(0xfff1a8, { flat: false })));
  houseWin.position.set(-0.06, 0.11, 0.034);
  front.add(houseWin);
  const chimney = mesh(geo(new BoxGeometry(0.04, 0.09, 0.04)), mat(paper(0xb5654a)));
  chimney.position.set(-0.08, 0.27, 0);
  front.add(chimney);
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
